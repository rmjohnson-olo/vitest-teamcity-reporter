import { Benchmark, Task, TaskResultPack, Test } from 'vitest';
// eslint-disable-next-line no-console
const print = (message: unknown, ...args: string[]) => console.info(message, ...args);

// See https://www.jetbrains.com/help/teamcity/service-messages.html#Supported+Test+ServiceMessages
const printSuiteStarted = (name: string, flowId: string) => print(`##teamcity[testSuiteStarted name='${name}' flowId='${flowId}']`);
const printTestStarted = (name: string, flowId: string) => print(`##teamcity[testStarted name='${name}' flowId='${flowId}']`);
const printTestFailed = (name: string, { message = '', details = '', actual = '', expected = '' }, flowId: string) =>
    print(
        `##teamcity[testFailed name='${name}' message='${message}' details='${details}' actual='${actual}' expected='${expected}' type='comparisonFailure' flowId='${flowId}']`
    );
const printTestIgnored = (name: string, message = '', flowId: string) =>
    print(`##teamcity[testIgnored name='${name}' message='${message}' flowId='${flowId}']`);
const printTestFinished = (name: string, duration: number, flowId: string) =>
    print(`##teamcity[testFinished name='${name}' duration='${duration}' flowId='${flowId}']`);
const printSuiteFinished = (name: string, flowId: string) => print(`##teamcity[testSuiteFinished name='${name}' flowId='${flowId}']`);

const escape = (str: string = ''): string => {
    return str
        .toString()
        .replace(/\x1B.*?m/g, '')
        .replace(/\|/g, '||')
        .replace(/\n/g, '|n')
        .replace(/\r/g, '|r')
        .replace(/\[/g, '|[')
        .replace(/\]/g, '|]')
        .replace(/\u0085/g, '|x')
        .replace(/\u2028/g, '|l')
        .replace(/\u2029/g, '|p')
        .replace(/'/g, "|'");
};
const buildTestName = (task: Test | Benchmark) => `${escape(task.name)}`;

type TaskIndex = Map<string, Task>;

const printTask = (taskIndex: TaskIndex) => (task: Task) => {
    if (task.type === 'suite') {
        if (task.mode === 'run') {
            printSuiteStarted(task.name, task.id);
        }
        taskIndex.set(task.id, task);
        task.tasks.forEach(printTask(taskIndex));
    } else if (task.type === 'test') {
        const name = buildTestName(task);
        if (task.mode === 'skip') {
            printTestIgnored(name, undefined, task.id);
        }
        if (task.mode === 'run') {
            printTestStarted(name, task.id);
        }
        taskIndex.set(task.id, task);
    }
};

const printTaskResultPack =
    (taskIndex: TaskIndex) =>
    ([id, result]: TaskResultPack) => {
        if (taskIndex.has(id)) {
            const task = taskIndex.get(id);
            if (!task || !result) return;

            if (task.type === 'suite') {
                const name = escape(task.name);
                printSuiteFinished(name, task.id);
            } else {
                const name = buildTestName(task);
                switch (result.state) {
                    case 'skip':
                        printTestIgnored(name, undefined, task.id);
                        break;
                    case 'pass':
                        printTestFinished(name, result.duration ?? 0, task.id);
                        break;
                    case 'fail':
                        printTestFailed(
                            name,
                            {
                                message: result.error?.message,
                                details: result.error?.stackStr,
                                actual: result.error?.actual,
                                expected: result.error?.expected,
                            },
                            task.id
                        );
                        break;
                    default:
                        // do nothing
                        break;
                }
            }
        }
    };

export { printTask, printTaskResultPack, print };
export type { TaskIndex };
