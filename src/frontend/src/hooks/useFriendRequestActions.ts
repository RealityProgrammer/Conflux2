import { type QueryKey, useMutation } from "@tanstack/react-query";
import { friendService } from "../api/friendService.ts";

export type FriendActionType = "accept" | "reject" | "cancel";

export interface UseFriendRequestActionsVariables {
  requestId: string;
  action: FriendActionType;
}

export default function useFriendRequestActions() {
  return useMutation({
    mutationKey: useFriendRequestActions.key,
    mutationFn: async (
      variables: UseFriendRequestActionsVariables,
    ): Promise<any> => {
      switch (variables.action) {
        case "cancel":
          return await friendService.cancelFriendRequest(variables.requestId);

        case "reject":
          return await friendService.rejectFriendRequest(variables.requestId);

        case "accept":
          return await friendService.acceptFriendRequest(variables.requestId);
      }
    },
  });
}

useFriendRequestActions.key = ["useFriendRequestActions"] as QueryKey;
