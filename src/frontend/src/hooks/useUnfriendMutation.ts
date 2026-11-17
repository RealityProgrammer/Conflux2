import { type QueryKey, useMutation } from "@tanstack/react-query";
import { friendService } from "../api/friendService.ts";

export interface UseUnfriendMutationVariables {
  friendId: string;
}

export default function useUnfriendMutation() {
  return useMutation({
    mutationKey: useUnfriendMutation.key,
    mutationFn: async (variables: UseUnfriendMutationVariables) => {
      await friendService.unfriend(variables.friendId);
    },
  });
}

useUnfriendMutation.key = ["useUnfriendMutation"] as QueryKey;
