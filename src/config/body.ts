import { readJsonAsync } from '~io'
import { resolve } from 'path'

interface BodyConfig {
  body?: Data
  bodyPath?: string
  serveBody?: Data
  serveBodyPath?: string
}

export type GetBodyToUse = (config: BodyConfig) => Promise<Optional<Data>>

export const createGetBodyToUse = (configPath: string): GetBodyToUse => async config => {
  const { body, bodyPath, serveBody, serveBodyPath } = config

  if (body) return body
  if (bodyPath) return await readJsonAsync(resolve(configPath, '..', bodyPath))
  if (serveBody) return serveBody
  if (serveBodyPath) return await readJsonAsync(resolve(configPath, '..', serveBodyPath))
}