import { useState, useCallback } from "react";
import { apiService } from "../services/api";
import { IApiResponse } from "../data-intergation-plan/apiTypes";

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (apiCall: () => Promise<IApiResponse<T>>) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await apiCall();
        setState((prev) => ({
          ...prev,
          data: response.data || null,
          loading: false,
        }));
        return response;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error : new Error("An error occurred"),
          loading: false,
        }));
        throw error;
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Example usage:
// const { data, loading, error, execute } = useApi<UserData>();
//
// // In your component:
// useEffect(() => {
//   execute(() => apiService.getUserData(userId));
// }, [userId, execute]);
