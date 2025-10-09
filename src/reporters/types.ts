/**
 * Types for test events and results
 */

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip' | 'pending';
  duration: number;
  category?: string; // OpenAI production category
  error?: {
    message: string;
    stack?: string;
  };
}

export interface CategoryStats {
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  total: number;
  tests: TestResult[];
}

export interface TestState {
  results: TestResult[];
  categories: Map<string, CategoryStats>;
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
