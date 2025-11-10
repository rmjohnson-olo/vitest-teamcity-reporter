import { TestError } from '@vitest/utils'
import { type TestCase } from 'vitest/node'

export default class MissingResultError extends Error implements TestError {
  constructor(testCase: TestCase) {
    super()
    this.message = `Test: "${testCase.name}" from - "${
      testCase.module.relativeModuleId ?? 'unknown'
    }" missing a result after file test process finished`
  }

  [key: string]: unknown
}
