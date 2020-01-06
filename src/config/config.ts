import * as yup from 'yup'
import { safeLoad } from 'js-yaml'
import { readFileAsync } from '~io'
import { mapRequestConfig, RequestConfig } from './request'
import { ResponseConfig, mapResponseConfig } from './response'
import { TypeValidator } from '~validation'
import { createGetBodyToUse } from './body'

export interface Config {
  name: string
  request: RequestConfig
  response: ResponseConfig
}

export interface ConfigSchema {
  name: string
  request: { [index: string]: any }
  response: { [index: string]: any }
}

const configSchema = yup.array().of<ConfigSchema>(
  yup.object({
    name: yup.string().required(),
    request: yup.object().required(),
    response: yup.object().required(),
  }),
)

export enum Mode {
  Test = 'Test',
  Serve = 'Serve',
}

export default async function readConfig(
  configPath: string,
  typeValidator: TypeValidator,
  mode: Mode.Test | Mode.Serve,
): Promise<Config[]> {
  const rawConfig = safeLoad(await readFileAsync(configPath))
  const configs = (await configSchema.validate(rawConfig)).filter(
    x => mode === Mode.Serve || x.request.endpoints,
  )
  const getBody = createGetBodyToUse(configPath)

  const mappedConfigs = await Promise.all(
    configs.map(
      async ({ name, request, response }): Promise<Config[]> => {
        const requestConfigs = await mapRequestConfig(request, typeValidator, mode, getBody)
        const responseConfig = await mapResponseConfig(response, typeValidator, mode, getBody)

        return requestConfigs.map<Config>((requestConfig, i) => ({
          name: `${name} [${i}]`,
          request: requestConfig,
          response: responseConfig,
        }))
      },
    ),
  )

  return mappedConfigs.flat()
}
