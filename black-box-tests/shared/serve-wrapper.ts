import { ChildProcess, exec } from 'child_process'
import strip from 'strip-ansi'
import nodeFetch, { RequestInit, Response } from 'node-fetch'
import { NCDC_CONFIG_FILE, TSCONFIG_FILE, ENTRYPOINT } from './config-wrapper'

const waitForX = (condition: () => Promise<boolean> | boolean, timeout: number): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const retryPeriod = 0.5
    let tries = 0

    const interval: NodeJS.Timeout = setInterval(async () => {
      let conditionMet = false
      let recentError: Error | undefined

      try {
        conditionMet = await condition()
      } catch (err) {
        recentError = err
      }

      if (conditionMet && recentError === undefined) {
        clearInterval(interval)
        resolve()
      }

      if (tries >= timeout / retryPeriod) {
        clearInterval(interval)
        if (recentError) {
          recentError.message = `Condition not met within ${timeout}s timeout ${recentError}`
          return reject(recentError)
        }

        const err = new Error(`Condition not met within ${timeout}s timeout`)
        return reject(err)
      }

      return tries++
    }, retryPeriod * 1000)
  })

export const MESSAGE_RESTARTING = 'Attempting to restart ncdc server'
export const MESSAGE_RESTARTING_FAILURE = 'Could not restart ncdc server'

export type ServeResult = {
  getStrippedOutput(): string
  waitForOutput(target: string | RegExp): Promise<void>
  waitUntilAvailable(): Promise<void>
}

export type CleanupTask = () => void

export const SERVE_HOST = 'http://localhost:4000'
export const fetch = (endpoint: string, init?: RequestInit): Promise<Response> =>
  nodeFetch(`${SERVE_HOST}${endpoint}`, init)

export const prepareServe = (cleanupTasks: CleanupTask[], timeout = 5) => async (
  args = '',
  checkAvailability = true,
): Promise<ServeResult> => {
  let hasExited = false
  const command = `CHOKIDAR_USEPOLLING=1 ${ENTRYPOINT} serve ${NCDC_CONFIG_FILE} -c ${TSCONFIG_FILE} ${args} -v`
  const ncdc: ChildProcess = exec(command)
  const output: string[] = []
  const getRawOutput = (): string => output.join('\n')
  const getStrippedOutput = (): string => strip(getRawOutput())

  ncdc.stdout && ncdc.stdout.on('data', (data: string) => output.push(...data.split('\n').filter((x) => !!x)))
  ncdc.stderr && ncdc.stderr.on('data', (data: string) => output.push(...data.split('\n').filter((x) => !!x)))
  ncdc.on('exit', (code, signal) => {
    hasExited = true
    if (code !== 0 && signal !== 'SIGTERM' && checkAvailability) {
      const quickInfo = `Code: ${code} | Signal: ${signal}`
      throw new Error(`${quickInfo} | Output:\n\n${getRawOutput()}`)
    }
  })

  const cleanup = (): void => {
    if (ncdc.killed || hasExited) return
    hasExited = true
    const killed = ncdc.kill()
    if (!killed) console.error('Could not kill the ncdc serve process')
  }

  cleanupTasks.push(cleanup)

  const failNicely = (message: string) => (err: Error): never => {
    console.error(`${message}. Output:\n\n${getRawOutput()}`)
    cleanup()
    throw err
  }

  let outputPointer = 0
  const waitForOutput: ServeResult['waitForOutput'] = async (target) => {
    return await waitForX(() => {
      const currentOutput = [...output]
      const searchableOutput = currentOutput.slice(outputPointer)
      const foundIndex = searchableOutput.findIndex((s) => {
        if (typeof target === 'string') return strip(s).includes(target)
        return target.test(s)
      }, timeout)

      if (foundIndex === -1) {
        outputPointer = currentOutput.length
        return false
      }

      outputPointer += foundIndex + 1
      return true
    }, timeout).catch(
      failNicely(
        `Did not find the string "${target}" in the output${
          outputPointer ? ' on or after line ' + outputPointer : ''
        }`,
      ),
    )
  }

  const waitUntilAvailable: ServeResult['waitUntilAvailable'] = () =>
    waitForX(async () => {
      const { status } = await fetch('/')
      return status === 200 && !getStrippedOutput().includes('EADDRINUSE')
    }, timeout).catch(failNicely(`The ncdc server was not contactable at ${SERVE_HOST}/`))

  if (checkAvailability) await waitUntilAvailable()
  return { getStrippedOutput, waitForOutput, waitUntilAvailable }
}
