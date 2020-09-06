import { readYamlAsync, getFixturePath } from '~io'
import { TypeValidator } from '~validation'
import { validateConfigBodies, validateRawConfig, ValidatedRawConfig } from './validate'
import { Resource } from '~config'
import {
  ServiceConfigReadError,
  ServiceConfigInvalidError,
  NoServiceResourcesError,
  BodyValidationError,
  InvalidBodyTypeError,
} from './errors'

export type LoadConfigResponse = {
  configs: Resource[]
  fixturePaths: string[]
}

export type TransformResources<T> = (resources: T[], absoluteConfigPath: string) => Promise<Resource[]>
export type GetTypeValidator = () => Promise<TypeValidator>
export type LoadConfig<T extends ValidatedRawConfig> = (
  configPath: string,
  getTypeValidator: GetTypeValidator,
  transformConfigs: TransformResources<T>,
  isTestMode: boolean,
) => Promise<LoadConfigResponse>

const loadConfig = async <T extends ValidatedRawConfig>(
  configPath: string,
  getTypeValidator: GetTypeValidator,
  transformConfigs: TransformResources<T>,
  isTestMode: boolean,
): Promise<LoadConfigResponse> => {
  let rawConfigFile: unknown

  try {
    rawConfigFile = await readYamlAsync(configPath)
  } catch (err) {
    throw new ServiceConfigReadError(configPath, err.message)
  }

  const validationResult = validateRawConfig<T>(rawConfigFile)
  if (!validationResult.success) {
    throw new ServiceConfigInvalidError(configPath, validationResult.errors)
  }

  if (!validationResult.validatedConfigs.length) {
    throw new NoServiceResourcesError(configPath)
  }

  const transformedConfigs = await transformConfigs(validationResult.validatedConfigs, configPath)

  if (!!transformedConfigs.find((c) => c.request.type || c.response.type)) {
    let bodyValidationMessage: string | undefined

    try {
      bodyValidationMessage = await validateConfigBodies(
        transformedConfigs,
        await getTypeValidator(),
        isTestMode,
      )
    } catch (err) {
      throw new BodyValidationError(configPath, err.message)
    }

    if (bodyValidationMessage) {
      throw new InvalidBodyTypeError(configPath, bodyValidationMessage)
    }
  }

  return {
    configs: transformedConfigs,
    fixturePaths: validationResult.validatedConfigs
      .flatMap((c) => [c.request.bodyPath, c.response.bodyPath, c.response.serveBodyPath])
      .filter((x): x is string => !!x)
      .map((fixturePath) => getFixturePath(configPath, fixturePath)),
  }
}

export default loadConfig
