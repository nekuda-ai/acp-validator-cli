/**
 * Stream Reporter - bridges Vitest to UI layer
 * Listens to Vitest events and updates TestStateManager
 */

import type { Reporter, Task, File } from 'vitest';
import type { TestStateManager } from '../core/test-state.js';
import type { TestResult } from './types.js';

export class StreamReporter implements Reporter {
  private processedTests = new Set<string>();

  constructor(private testState: TestStateManager) {}

  /**
   * Called when tests start
   */
  onInit(): void {
    this.testState.reset();
    this.processedTests.clear();
  }

  /**
   * Called when all tests finish - process results from files
   */
  async onFinished(files: File[] = []): Promise<void> {
    // Process all test results from files
    files.forEach(file => {
      this.processTaskResults(file.tasks);
    });

    // Mark as complete
    this.testState.onComplete();
  }

  /**
   * Process test results recursively
   */
  private processTaskResults(tasks: Task[]): void {
    tasks.forEach(task => {
      if (task.type === 'suite') {
        // Recursively process suite tasks
        this.processTaskResults(task.tasks);
      } else if (task.type === 'test') {
        // Only process each test once
        const testKey = `${task.file?.name || 'unknown'}::${task.name}`;
        if (!this.processedTests.has(testKey)) {
          this.processedTests.add(testKey);

          const result: TestResult = {
            name: task.name,
            status: this.mapStatus(task.result?.state || 'pending'),
            duration: task.result?.duration || 0,
            ...(task.result?.errors?.length && {
              error: {
                message: task.result.errors[0]?.message || 'Unknown error',
                stack: task.result.errors[0]?.stack,
              },
            }),
          };

          this.testState.addResult(result);
        }
      }
    });
  }

  /**
   * Map Vitest test state to our simplified status
   */
  private mapStatus(state: string): TestResult['status'] {
    switch (state) {
      case 'pass':
        return 'pass';
      case 'fail':
        return 'fail';
      case 'skip':
        return 'skip';
      default:
        return 'pending';
    }
  }
}
