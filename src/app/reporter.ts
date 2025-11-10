import { Reporter, TestSuite, type TestCase, type TestModule, type Vitest } from 'vitest/node'
import { Awaitable } from '@vitest/utils'
import { Printer } from './printer'
import { UserConsoleLog } from 'vitest'

class TeamCityReporter implements Reporter {
  private logger!: Vitest['logger']
  private printer!: Printer

  onInit(ctx: Vitest): void {
    this.logger = ctx.logger
    this.printer = new Printer(this.logger)
  }

  onTestModuleCollected(testModule: TestModule): Awaitable<void> {
    this.printer.addTestModule(testModule)
  }

  onTestCaseResult(testCase: TestCase): Awaitable<void> {
    this.printer.handleResult(testCase)
  }

  onTestSuiteResult(testSuite: TestSuite): Awaitable<void> {
    this.printer.handleResult(testSuite)
  }

  onTestModuleEnd(testModule: TestModule): Awaitable<void> {
    this.printer.handleResult(testModule)
  }

  onUserConsoleLog(log: UserConsoleLog): Awaitable<void> {
    if (log.taskId != null) {
      this.printer.addTestConsoleLog(log.taskId, log)
    } else {
      this.logger.console.log(log)
    }
  }
}

export { TeamCityReporter }
