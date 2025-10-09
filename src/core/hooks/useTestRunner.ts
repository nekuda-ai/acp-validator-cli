/**
 * React hook to connect UI to test state business logic
 * Subscribes to test state events and updates component state
 */

import { useState, useEffect } from 'react';
import type { TestStateManager } from '../test-state.js';
import type { TestState } from '../../reporters/types.js';

export function useTestRunner(testState: TestStateManager) {
  const [state, setState] = useState<TestState>(testState.getState());

  useEffect(() => {
    const handleUpdate = (newState: TestState) => {
      setState(newState);
    };

    const handleComplete = (finalState: TestState) => {
      setState(finalState);
    };

    // Subscribe to events
    testState.on('update', handleUpdate);
    testState.on('complete', handleComplete);

    // Cleanup on unmount
    return () => {
      testState.off('update', handleUpdate);
      testState.off('complete', handleComplete);
    };
  }, [testState]);

  return {
    state,
    isRunning: !state.isComplete,
  };
}
