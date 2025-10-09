/**
 * Stream Reporter - bridges Vitest to UI layer
 * Listens to Vitest events and updates TestStateManager in real-time
 */

import type { Reporter } from 'vitest';
import type { TestStateManager } from '../core/test-state.js';
import type { TestResult } from './types.js';
import { categorizeTest } from '../core/categories.js';

// Import new Vitest types
type TestCase = any; // Vitest's TestCase type
type TestModule = any; // Vitest's TestModule type

export class StreamReporter implements Reporter {
  private testCounts = new Map<string, number>();

  constructor(private testState: TestStateManager) {}

  /**
   * Called when tests start
   */
  onInit(): void {
    this.testState.reset();
    this.testCounts.clear();
  }

  /**
   * Called when a test is about to run (new Vitest API)
   */
  onTestCaseReady(testCase: TestCase): void {
    // Get suite name from parent
    const suiteName = this.getSuiteName(testCase);

    // Mark test as started
    this.testState.onTestStart(testCase.name);

    // Add pending result immediately
    const result: TestResult = {
      name: testCase.name,
      status: 'pending',
      duration: 0,
      category: categorizeTest(testCase.name, suiteName),
    };

    this.testState.addResult(result);
  }

  /**
   * Called when a test finishes (new Vitest API)
   */
  onTestCaseResult(testCase: TestCase): void {
    const suiteName = this.getSuiteName(testCase);
    const testResult = testCase.result();

    // Create result with actual status
    const result: TestResult = {
      name: testCase.name,
      status: this.mapStatus(testResult.state),
      duration: testResult.duration || 0,
      category: categorizeTest(testCase.name, suiteName),
      ...(testResult.errors?.length && {
        error: {
          message: testResult.errors[0]?.message || 'Unknown error',
          stack: testResult.errors[0]?.stack,
        },
      }),
    };

    // Update the result (will replace pending one)
    this.testState.addResult(result);
  }

  /**
   * Called when all tests are complete (new Vitest API)
   */
  onTestRunEnd(): void {
    this.testState.onComplete();
  }

  /**
   * Get suite name from test case parent hierarchy
   */
  private getSuiteName(testCase: TestCase): string | undefined {
    const parts: string[] = [];
    let current = testCase.parent;

    while (current && current.type === 'suite') {
      parts.unshift(current.name);
      current = current.parent;
    }

    return parts.length > 0 ? parts.join(' > ') : undefined;
  }

  /**
   * Map Vitest test state to our simplified status
   */
  private mapStatus(state: string): TestResult['status'] {
    switch (state) {
      case 'passed':
      case 'pass':
        return 'pass';
      case 'failed':
      case 'fail':
        return 'fail';
      case 'skipped':
      case 'skip':
        return 'skip';
      default:
        return 'pending';
    }
  }
}
