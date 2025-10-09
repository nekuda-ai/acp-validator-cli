/**
 * Business logic layer for test state management
 * No UI dependencies - can be tested independently
 */

import { EventEmitter } from 'events';
import type { TestResult, TestState, CategoryStats } from '../reporters/types.js';

export class TestStateManager extends EventEmitter {
  private results: TestResult[] = [];
  private categories = new Map<string, CategoryStats>();
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  private total = 0;
  private isComplete = false;

  /**
   * Add or update a test result and emit update event
   */
  addResult(result: TestResult): void {
    // Check if this test already exists (by name)
    const existingIndex = this.results.findIndex(r => r.name === result.name);

    if (existingIndex >= 0) {
      // Update existing result
      const oldResult = this.results[existingIndex];

      // Decrement old status counts
      if (oldResult.status === 'pass') this.passed--;
      if (oldResult.status === 'fail') this.failed--;
      if (oldResult.status === 'skip') this.skipped--;

      // Update the result
      this.results[existingIndex] = result;

      // Update category stats (remove old, add new)
      if (oldResult.category) {
        this.removeCategoryTest(oldResult);
      }
    } else {
      // Add new result
      this.results.push(result);
    }

    // Increment new status counts
    if (result.status === 'pass') this.passed++;
    if (result.status === 'fail') this.failed++;
    if (result.status === 'skip') this.skipped++;

    // Update category stats
    if (result.category) {
      this.updateCategoryStats(result);
    }

    this.emit('update', this.getState());
  }

  /**
   * Remove a test from category stats
   */
  private removeCategoryTest(result: TestResult): void {
    const category = result.category!;
    const stats = this.categories.get(category);

    if (stats) {
      // Remove from tests array
      const testIndex = stats.tests.findIndex(t => t.name === result.name);
      if (testIndex >= 0) {
        stats.tests.splice(testIndex, 1);
      }

      // Decrement counts
      stats.total--;
      if (result.status === 'pass') stats.passed--;
      if (result.status === 'fail') stats.failed--;
      if (result.status === 'skip') stats.skipped--;
    }
  }

  /**
   * Update category statistics
   */
  private updateCategoryStats(result: TestResult): void {
    const category = result.category!;

    if (!this.categories.has(category)) {
      this.categories.set(category, {
        name: category,
        passed: 0,
        failed: 0,
        skipped: 0,
        total: 0,
        tests: [],
      });
    }

    const stats = this.categories.get(category)!;
    stats.tests.push(result);
    stats.total++;
    if (result.status === 'pass') stats.passed++;
    if (result.status === 'fail') stats.failed++;
    if (result.status === 'skip') stats.skipped++;
  }

  /**
   * Get current test state snapshot
   */
  getState(): TestState {
    return {
      results: [...this.results],
      categories: new Map(this.categories),
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
    this.categories.clear();
    this.passed = 0;
    this.failed = 0;
    this.skipped = 0;
    this.total = 0;
    this.isComplete = false;
    this.emit('reset');
  }
}
