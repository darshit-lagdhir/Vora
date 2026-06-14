import { useState } from 'react';
import { toast } from '../components/ui/Toast.jsx';

/**
 * Custom hook for executing optimistic UI updates with rollback capabilities.
 */
export default function useOptimisticMutation(mutationFn, stateSetter) {
  const [isPending, setIsPending] = useState(false);

  const mutate = async (optimisticUpdater, ...args) => {
    setIsPending(true);
    let snapshot = null;

    // 1. Capture snapshot of the current state via setter callback
    stateSetter((currentState) => {
      // Create deep clone of active state array
      snapshot = JSON.parse(JSON.stringify(currentState));
      
      // Perform local optimistic mutation
      return optimisticUpdater(currentState);
    });

    try {
      // 2. Dispatch request to server
      await mutationFn(...args);
    } catch (error) {
      console.error('[Optimistic Mutation] Mutation failed, rolling back:', error);

      // 3. Rollback state to snapshot
      if (snapshot !== null) {
        stateSetter(snapshot);
      }

      // 4. Dispatch red Toast warning
      const message = error.response?.data?.message || 'Operation failed. The database could not process the mutation.';
      toast(`Operation failed. ${message}. The interface has been synchronized to the current server state.`, 'error');
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate,
    isPending,
  };
}
