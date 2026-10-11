import {type MutationStatus, useMutation, type UseMutationOptions, useMutationState} from "@tanstack/react-query";
import type {ServiceResponse} from "../api/types.ts";
import {communityServerService} from "../api/communityServerService.ts";

export interface UseChannelDeleteMutationVariables {
  serverId: string;
  channelId: string;
}

export interface UseChannelDeleteMutationState {
  status: MutationStatus;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: Error | null;
}

export function useChannelDeleteMutation(
  options?: Omit<UseMutationOptions<ServiceResponse, Error, UseChannelDeleteMutationVariables, unknown>, "mutationFn" | "mutationKey">,
) {
  return useMutation<ServiceResponse, Error, UseChannelDeleteMutationVariables, unknown>({
    mutationKey: ["channelDelete"],
    mutationFn: async (variables: UseChannelDeleteMutationVariables): Promise<ServiceResponse> => {
      return communityServerService.deleteChannel(variables.serverId, variables.channelId);
    },
    ...options,
  });
}

export function useChannelDeleteMutationState(serverId: string, channelId: string) {
  const mutations = useMutationState({
    filters: { mutationKey: ["channelDelete"] },
    select: (mutation) => {
      const variables = mutation.state.variables as UseChannelDeleteMutationVariables | undefined;
      const isTarget = variables?.serverId === serverId && variables?.channelId === channelId;

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