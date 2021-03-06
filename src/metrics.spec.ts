import MetricsReporter from '~metrics'
import { mockObj, randomString } from '~test-helpers'
import { NcdcLogger } from '~logger'
import { blue, green, red } from 'chalk'

jest.disableAutomock()

describe('metrics', () => {
  it('logs the correct message at the start and end of an operation', () => {
    const dummyLogger = mockObj<NcdcLogger>({ debug: jest.fn() })
    const operation = randomString('operation')

    const { success, fail } = new MetricsReporter(dummyLogger).report(operation)
    success()
    fail()

    expect(dummyLogger.debug).toHaveBeenNthCalledWith(1, `Metric: ${operation} - ${blue('started')}`)
    expect(dummyLogger.debug).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining(
        `Metric: ${operation} - ${green('completed')} | time taken: ${blue('0.00s')} | elapsed time: ${blue(
          '0.00s',
        )}`,
      ),
    )
    expect(dummyLogger.debug).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining(
        `Metric: ${operation} - ${red('failed')} | time taken: ${blue('0.00s')} | elapsed time: ${blue(
          '0.00s',
        )}`,
      ),
    )
  })
})
