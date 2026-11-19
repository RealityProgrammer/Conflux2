import { useMutation, type UseMutationOptions, type UseMutationResult } from "@tanstack/react-query";
import { conversationService } from "../api/conversationService.ts";
import type { TimelineMessageDto } from "../api/types.ts";
import type { MessageSendInput } from "../store/useMessageOperationsStore.ts";

export type UseSendMessageMutationVariables = {
  conversationId: string;
  idempotencyKey: string;
  input: MessageSendInput;
};

export default function useSendMessageMutation(
  options?: Omit<
    UseMutationOptions<TimelineMessageDto, Error, UseSendMessageMutationVariables>,
    "mutationKey" | "mutationFn"
  >,
): UseMutationResult<TimelineMessageDto, Error, UseSendMessageMutationVariables> {
  return useMutation({
    mutationKey: useSendMessageMutation.key,
    mutationFn: async (variables: UseSendMessageMutationVariables) => {
      return await conversationService.sendMessage(
        variables.conversationId,
        variables.idempotencyKey,
        variables.input.body,
        variables.input.attachments,
        variables.input.replyingMessageId,
      );
    },
    ...options,
  });
}

useSendMessageMutation.key = ["useSendMessageMutation"];
