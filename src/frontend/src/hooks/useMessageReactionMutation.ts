import {useMutation, type UseMutationOptions} from "@tanstack/react-query";
import {conversationService} from "../api/conversationService.ts";

interface UseMessageReactionMutationVariables {
  conversationId: string;
  messageId: string;
  reactionKey: Parameters<typeof conversationService.toggleReaction>[2];
  action: "add" | "remove";
}

export default function useMessageReactionMutation(
  options: Omit<UseMutationOptions<void, Error, UseMessageReactionMutationVariables, unknown>, "mutationFn" | "mutationKey">
) {
  return useMutation<void, Error, UseMessageReactionMutationVariables, unknown>({
    mutationKey: useMessageReactionMutation.key,
    mutationFn: async (variables: UseMessageReactionMutationVariables): Promise<void> => {
      return await conversationService.toggleReaction(variables.conversationId, variables.messageId, variables.reactionKey, variables.action);
    },
    ...options,
  })
}

useMessageReactionMutation.key = ["useMessageReactionMutation"];