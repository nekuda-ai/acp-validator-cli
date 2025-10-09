/**
 * RunScreen - Main screen for test execution
 * Orchestrates all UI components and connects to business logic
 */

import React from 'react';
import { Box, Text } from 'ink';
import { TaskList, Task } from 'ink-task-list';
import spinners from 'cli-spinners';
import { useTestRunner } from '../../core/hooks/useTestRunner.js';
import type { TestStateManager } from '../../core/test-state.js';

interface Props {
  testState: TestStateManager;
  checkoutUrl?: string;
  verbose?: boolean;
}

export const RunScreen: React.FC<Props> = ({ testState, checkoutUrl, verbose = false }) => {
  const { state, isRunning } = useTestRunner(testState);

  const totalTests = state.passed + state.failed + state.skipped;
  const successRate = totalTests > 0 ? ((state.passed / totalTests) * 100).toFixed(1) : '0';

  // Convert categories Map to array for rendering
  const categories = Array.from(state.categories.values());

  return (
    <Box flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold>ACP Test Runner</Text>
      </Box>
      {checkoutUrl && (
        <Box marginBottom={1}>
          <Text dimColor>Testing: {checkoutUrl}</Text>
        </Box>
      )}

      {/* Summary Stats */}
      <Box marginBottom={1}>
        <Text>
          Passed: <Text color="green">{state.passed}</Text> |
          Failed: <Text color="red">{state.failed}</Text> |
          Total: {totalTests} ({successRate}%)
        </Text>
      </Box>

      {/* Task List with Categories */}
      <TaskList>
        {categories.map((category, i) => {
          // Determine category state
          const hasRunning = category.tests.some(t => t.status === 'pending');
          const categoryState =
            category.failed > 0 ? 'error' :
            hasRunning ? 'loading' :
            category.passed === category.total ? 'success' :
            'pending';

          const status = `${category.passed}/${category.total}`;

          return (
            <Task
              key={i}
              label={category.name}
              state={categoryState}
              status={status}
              isExpanded={verbose || category.failed > 0} // Expand if verbose OR if has failures
              spinner={spinners.dots}
            >
              {category.tests.map((test, j) => (
                <Task
                  key={j}
                  label={test.name}
                  state={
                    test.status === 'pass' ? 'success' :
                    test.status === 'fail' ? 'error' :
                    test.status === 'skip' ? 'warning' :
                    test.status === 'pending' ? 'loading' :
                    'pending'
                  }
                  output={test.error?.message}
                  spinner={spinners.dots}
                />
              ))}
            </Task>
          );
        })}

        {/* Show loading state if tests are running */}
        {isRunning && (
          <Task
            label="Running tests..."
            state="loading"
            spinner={spinners.dots}
          />
        )}
      </TaskList>

      {/* Final Summary */}
      {!isRunning && totalTests > 0 && (
        <Box marginTop={1} flexDirection="column">
          <Text bold>
            {state.failed === 0 && state.passed > 0 ? (
              <Text color="green">All tests passed!</Text>
            ) : (
              <Text color="red">Some tests failed</Text>
            )}
          </Text>
        </Box>
      )}
    </Box>
  );
};
