import {
  useMutation,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { conversationService } from "../api/conversationService.ts";

export type UseDeleteMessageMutationVariables = {
  conversationId: string;
  messageId: string;
};

export default function useDeleteMessageMutation(
  options?: Omit<
    UseMutationOptions<void, Error, UseDeleteMessageMutationVariables>,
    "mutationKey" | "mutationFn"
  >,
): UseMutationResult<void, Error, UseDeleteMessageMutationVariables> {
  return useMutation({
    mutationKey: useDeleteMessageMutation.key,
    mutationFn: async (
      variables: UseDeleteMessageMutationVariables,
    ): Promise<void> => {
      await conversationService.deleteMessage(
        variables.conversationId,
        variables.messageId,
      );
    },
    ...options,
  });
}

useDeleteMessageMutation.key = ["useDeleteMessageMutation"];
