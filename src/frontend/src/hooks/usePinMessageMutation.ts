import {
  type MutationFunctionContext,
  useMutation,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { conversationService } from "../api/conversationService.ts";
import type { TimelineMessageDto } from "../api/types.ts";

export interface UsePinMessageVariables {
  idempotencyKey: string;
  conversationId: string;
  messageId: string;
  action: "pin" | "unpin";
}

export default function usePinMessageMutation(
  options?: Omit<
    UseMutationOptions<TimelineMessageDto, Error, UsePinMessageVariables>,
    "mutationFn" | "mutationKey"
  >,
) {
  return useMutation<
    TimelineMessageDto,
    Error,
    UsePinMessageVariables,
    unknown
  >({
    mutationKey: usePinMessageMutation.key,
    mutationFn: async (
      variables: UsePinMessageVariables,
      _context: MutationFunctionContext,
    ) => {
      return conversationService.pinMessage(
        variables.idempotencyKey,
        variables.conversationId,
        variables.messageId,
        variables.action,
      );
    },
    ...options,
  });
}

usePinMessageMutation.key = ["usePinMessageMutation"];
