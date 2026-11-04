import {useMutation, type UseMutationOptions} from "@tanstack/react-query";
import {serverService} from "../api/serverService.ts";

export interface UseLeaveServerMutationVariables {
  serverId: string;
}

export default function useLeaveServerMutation(
  options?: Omit<UseMutationOptions<void, Error, UseLeaveServerMutationVariables, unknown>, "mutationFn" | "mutationKey">
) {
  return useMutation<void, Error, UseLeaveServerMutationVariables, unknown>({
    mutationKey: useLeaveServerMutation.key,
    mutationFn: async (variables: UseLeaveServerMutationVariables) => {
      return await serverService.leaveServer(variables.serverId);
    },
    ...options,
  });
}

useLeaveServerMutation.key = ["useLeaveServerMutation"];