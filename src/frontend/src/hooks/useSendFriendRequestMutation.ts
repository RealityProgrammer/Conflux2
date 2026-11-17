import {
  type QueryKey,
  useMutation,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { friendService } from "../api/friendService.ts";
import type { SendFriendRequestResult } from "../api/types.ts";

export interface UseSendFriendRequestMutationVariables {
  recipientId: string;
}

export default function useSendFriendRequestMutation(
  options?: Omit<
    UseMutationOptions<
      SendFriendRequestResult,
      Error,
      UseSendFriendRequestMutationVariables
    >,
    "mutationKey" | "mutationFn"
  >,
) {
  return useMutation({
    mutationKey: useSendFriendRequestMutation.key,
    mutationFn: async (variables: UseSendFriendRequestMutationVariables) => {
      const response = await friendService.sendFriendRequest(
        variables.recipientId,
      );
      return response.data!;
    },
    ...options,
  });
}

useSendFriendRequestMutation.key = ["useSendFriendRequestMutation"] as QueryKey;
