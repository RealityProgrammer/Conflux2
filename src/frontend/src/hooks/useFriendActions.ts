import {useMutation, type UseMutationResult, useMutationState} from "@tanstack/react-query";
import {friendService} from "../api/friendService.ts";
import type {ServiceResponse} from "../api/types.ts";
import type {UserRelationshipStatus} from "../api/schema.ts";

export type FriendActionType = 'send' | 'accept' | 'reject' | 'cancel' | 'unfriend';

export type UseFriendActionsResult = {
  mutation: UseMutationResult<ServiceResponse | ServiceResponse<UserRelationshipStatus>, Error, FriendActionType>;
  activeAction: FriendActionType | null;
}

export default function useFriendActions(friendUserId: string): UseFriendActionsResult {
  const mutationKey = ["friendActions", friendUserId];

  const mutation =
    useMutation<ServiceResponse | ServiceResponse<UserRelationshipStatus>, Error, FriendActionType>({
      mutationKey: mutationKey,
      mutationFn: async (actionType: FriendActionType): Promise<any> => {
        switch (actionType) {
          case "send":
            return await friendService.sendFriendRequest(friendUserId);

          case "cancel":
            return await friendService.cancelFriendRequest(friendUserId);

          case "reject":
            return await friendService.rejectFriendRequest(friendUserId);

          case "accept":
            return await friendService.acceptFriendRequest(friendUserId);

          case "unfriend":
            return await friendService.unfriend(friendUserId);
        }
      },
    });

  const pendingActions = useMutationState({
    filters: {mutationKey: mutationKey, status: 'pending'},
    select: (mutation) => mutation.state.variables as FriendActionType,
  });

  const activeAction = pendingActions[0] ?? null;

  return {
    mutation,
    activeAction
  };
}