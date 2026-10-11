import {type MutationStatus, useMutation, type UseMutationOptions, useMutationState} from "@tanstack/react-query";
import type {ServiceResponse} from "../api/types.ts";
import {communityServerService} from "../api/communityServerService.ts";

export interface UseChannelCategoryDeleteMutationVariables {
  serverId: string;
  categoryId: string;
}

export interface UseChannelCategoryDeleteMutationState {
  status: MutationStatus;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
}

export function useChannelCategoryDeleteMutation(
  options?: Omit<UseMutationOptions<ServiceResponse, Error, UseChannelCategoryDeleteMutationVariables, unknown>, "mutationFn" | "mutationKey">,
) {
  return useMutation<ServiceResponse, Error, UseChannelCategoryDeleteMutationVariables, unknown>({
    mutationKey: ["channelCategoryDelete"],
    mutationFn: async (variables: UseChannelCategoryDeleteMutationVariables): Promise<ServiceResponse> => {
      return communityServerService.deleteChannelCategory(variables.serverId, variables.categoryId);
    },
    ...options,
  });
}

export function useChannelCategoryDeleteMutationState(serverId: string, categoryId: string) {
  const mutations = useMutationState({
    filters: { mutationKey: ["channelCategoryDelete"] },
    select: (mutation) => {
      const variables = mutation.state.variables as UseChannelCategoryDeleteMutationVariables | undefined;
      const isTarget = variables?.serverId === serverId && variables?.categoryId === categoryId;

      if (!isTarget) return null;

      return {
        status: mutation.state.status,
        isPending: mutation.state.status === "pending",
        isSuccess: mutation.state.status === "success",
        isError: mutation.state.status === "error",
        error: mutation.state.error,
      };
    },
  });
  
  return mutations.filter(m => !!m).pop() || {
    status: "idle",
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
  };
}