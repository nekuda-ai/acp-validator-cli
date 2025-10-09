/**
 * Types for test events and results
 */

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip' | 'pending';
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface TestState {
  results: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  isComplete: boolean;
}

export interface TestEvent {
  type: 'test-start' | 'test-end' | 'suite-start' | 'complete';
  name?: string;
  result?: TestResult;
}
