import { TestCase, TestModule, TestSuite, Vitest } from 'vitest/node'
import { SuitMessage } from './messages/suite-message'
import { escape } from './escape'
import { TestMessage } from './messages/test-message'
import MissingResultError from './error/missing-result.error'
import { TestError, UserConsoleLog } from 'vitest'

type PotentialMessage = string | (() => string | string[])
type PotentialMessages = PotentialMessage[]

export class Printer {
  private readonly fileMessageMap = new Map<string, PotentialMessages>()
  private readonly testConsoleMap = new Map<string, UserConsoleLog[]>()

  constructor(private readonly logger: Vitest['logger']) {}

  public addTestModule = (testModule: TestModule): void => {
    const suitMessage = new SuitMessage(testModule.id, escape(testModule.relativeModuleId))
    const messages = [suitMessage.started(), ...testModule.children.array().flatMap(this.handleTask), suitMessage.finished()]
    this.fileMessageMap.set(testModule.id, messages)
  }

  public addTestConsoleLog(id: string, log: UserConsoleLog): void {
    const messages = this.testConsoleMap.get(id)
    if (messages != null) {
      messages.push(log)
    } else {
      this.testConsoleMap.set(id, [log])
    }
  }

  public handleResult = (task: TestCase | TestSuite | TestModule): void => {
    const { id } = task
    const state = task.type === 'test' ? task.result().state : task.state()
    const messages = this.fileMessageMap.get(id)
    if (messages != null && state != null && state !== 'pending') {
      messages
        .flatMap((message: PotentialMessage) => (typeof message === 'string' ? message : message()))
        .forEach((message) => {
          this.logger.console.info(message)
        })
      this.fileMessageMap.delete(id)
    }
  }

  private readonly handleTask = (task: TestCase | TestSuite): PotentialMessage | PotentialMessage[] => {
    if (task.type === 'test') {
      return this.handleTest(task)
    }
    if (task.type === 'suite' && task.state() !== 'skipped') {
      return this.handleSuite(task)
    }
    return []
  }

  private readonly handleSuite = (suite: TestSuite): PotentialMessage[] => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const suitMessage = new SuitMessage(suite.id, escape(suite.name))
    return [suitMessage.started(), ...suite.children.array().flatMap(this.handleTask), suitMessage.finished()]
  }

  private readonly handleTest = (test: TestCase): PotentialMessage => {
    const testMessage = new TestMessage(test)
    if (test.result().state === 'skipped') {
      return testMessage.ignored()
    }
    return () => {
      const fail = test.result() == null || test.result().state === 'failed'

      const logs = this.testConsoleMap.get(test.id) ?? []
      const logsMessages = logs.map((log) => testMessage.log(log.type, log.content))
      const filedMessages = fail ? this.getTestErrors(test).map(testMessage.fail) : []

      return [testMessage.started(), ...logsMessages, ...filedMessages, testMessage.finished(test.diagnostic()?.duration ?? 0)].filter(
        Boolean
      )
    }
  }

  private readonly getTestErrors = (test: TestCase): readonly TestError[] =>
    test.result()?.errors ?? test.parent?.errors() ?? test.module.errors() ?? [new MissingResultError(test)]
}
