import * as yup from 'yup'
import './methods'
import { TypeValidator, TypeValidationError } from '~validation'
import { ProblemType } from '~problem'
import { Mode } from './config'
import { IncomingHttpHeaders } from 'http'
import { GetBodyToUse } from './body'

export type SupportedMethod = 'GET' | 'POST'

export interface RequestConfig {
  method: SupportedMethod
  endpoint: string
  body?: Data
  type?: string
  headers?: IncomingHttpHeaders
}

export type RequestConfigArray = PopulatedArray<RequestConfig>

const endpointSchema = yup.string().startsWith('/')

const endpointsSchema = yup
  .array()
  .of(endpointSchema)
  .transform((_, oValue) => (Array.isArray(oValue) ? oValue : [oValue]))

const baseRequestConfigSchema = yup.object({
  method: yup
    .mixed<SupportedMethod>()
    .oneOf(['GET', 'POST'])
    .required(),
  type: yup.string().notRequired(),
  body: yup.mixed<Data>().notAllowedIfSiblings('bodyPath'),
  bodyPath: yup.string().notAllowedIfSiblings('body'),
  headers: yup
    .object<IncomingHttpHeaders>()
    .ofHeaders()
    .notRequired(),
})

const testRequestSchema = baseRequestConfigSchema
  .shape({ endpoints: endpointsSchema.required() })
  .allowedKeysOnly('serveEndpoint', 'serveBody', 'serveBodyPath')
export type TestRequestSchema = yup.InferType<typeof testRequestSchema>

const serveRequestSchema = baseRequestConfigSchema
  .shape({
    endpoints: endpointsSchema.requiredIfNoSiblings('serveEndpoint'),
    serveEndpoint: endpointSchema.requiredIfNoSiblings('endpoints'),
    serveBody: yup.mixed<Data>().notAllowedIfSiblings('body', 'bodyPath', 'serveBodyPath'),
    serveBodyPath: yup.string().notAllowedIfSiblings('body', 'bodyPath', 'serveBody'),
  })
  .allowedKeysOnly()
type ServeRequestSchema = yup.InferType<typeof serveRequestSchema>

const chooseEndpoints = ({
  endpoints,
  serveEndpoint,
}: Pick<ServeRequestSchema, 'endpoints' | 'serveEndpoint'>): PopulatedArray<string> =>
  serveEndpoint ? [serveEndpoint] : (endpoints as PopulatedArray<string>)

export const mapRequestConfig = async (
  requestConfig: object,
  typeValidator: TypeValidator,
  mode: Mode.Test | Mode.Serve,
  getRequestBody: GetBodyToUse,
): Promise<RequestConfigArray> => {
  const schema = mode === Mode.Test ? testRequestSchema : serveRequestSchema
  const validatedConfig = await schema.validate(requestConfig)
  const { type, method, headers } = validatedConfig

  const bodyToUse: Optional<Data> = await getRequestBody(validatedConfig)

  if (bodyToUse && type) {
    const problems = await typeValidator.getProblems(bodyToUse, type, ProblemType.Request)
    if (problems) throw new TypeValidationError(problems)
  }

  const endpointsToUse: PopulatedArray<string> = chooseEndpoints(validatedConfig)

  return endpointsToUse.map(endpoint => ({
    body: bodyToUse,
    endpoint,
    method,
    type,
    headers,
  })) as RequestConfigArray
}
