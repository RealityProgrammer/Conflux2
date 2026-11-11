import {useMutation, type UseMutationOptions, type UseMutationResult} from "@tanstack/react-query";
import {conversationService} from "../api/conversationService.ts";
import type {EditedMessageDto} from "../api/types.ts";
import type {MessageEditInput} from "../store/useMessageOperationsStore.ts";

export type UseEditMessageMutationVariables = MessageEditInput & {
  conversationId: string;
  messageId: string;
}

export default function useEditMessageMutation(
  options?: Omit<UseMutationOptions<EditedMessageDto, Error, UseEditMessageMutationVariables>, "mutationKey" | "mutationFn">
): UseMutationResult<EditedMessageDto, Error, UseEditMessageMutationVariables> {
  return useMutation({
    mutationKey: useEditMessageMutation.key,
    mutationFn: async (variables: UseEditMessageMutationVariables): Promise<EditedMessageDto> => {
      return await conversationService.editMessage(
        variables.conversationId,
        variables.messageId,
        variables.body,
        variables.removeAttachmentIds,
        variables.addAttachments
      );
    },
    ...options,
  })
}

useEditMessageMutation.key = ["useEditMessageMutation"];