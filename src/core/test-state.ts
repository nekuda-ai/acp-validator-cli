/**
 * Business logic layer for test state management
 * No UI dependencies - can be tested independently
 */

import { EventEmitter } from 'events';
import type { TestResult, TestState } from '../reporters/types.js';

export class TestStateManager extends EventEmitter {
  private results: TestResult[] = [];
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  private total = 0;
  private isComplete = false;

  /**
   * Add a test result and emit update event
   */
  addResult(result: TestResult): void {
    this.results.push(result);

    if (result.status === 'pass') this.passed++;
    if (result.status === 'fail') this.failed++;
    if (result.status === 'skip') this.skipped++;

    this.emit('update', this.getState());
  }

  /**
   * Get current test state snapshot
   */
  getState(): TestState {
    return {
      results: [...this.results],
      passed: this.passed,
      failed: this.failed,
      skipped: this.skipped,
      total: this.total,
      isComplete: this.isComplete,
    };
  }

  /**
   * Mark a test as started
   */
  onTestStart(name: string): void {
    this.total++;
    this.emit('test-start', { name });
  }

  /**
   * Mark tests as complete
   */
  onComplete(): void {
    this.isComplete = true;
    this.emit('complete', this.getState());
  }

  /**
   * Reset state for new test run
   */
  reset(): void {
    this.results = [];
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.total = 0;
    this.isComplete = false;
    this.emit('reset');
  }
}
