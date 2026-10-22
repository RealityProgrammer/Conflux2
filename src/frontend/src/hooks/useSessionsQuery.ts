import {type UndefinedInitialDataOptions, useQuery, type UseQueryResult} from "@tanstack/react-query";
import {authService} from "../api/authService.ts";
import type {SessionsQueryResult} from "../api/types.ts";

export default function useSessionsQuery(
  options?: Omit<UndefinedInitialDataOptions<SessionsQueryResult, Error>, "queryKey" | "queryFn">
): UseQueryResult<SessionsQueryResult, Error> {
  return useQuery({
    queryKey: useSessionsQuery.queryKey,
    queryFn: async (): Promise<SessionsQueryResult> => {
      const response = await authService.getSessions();
      
      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error!.message!);
      }
    },
    ...options
  })
}

useSessionsQuery.queryKey = ["SessionsQuery"];