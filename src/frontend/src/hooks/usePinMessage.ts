import {type MutationFunctionContext, useMutation, type UseMutationOptions} from "@tanstack/react-query";
import {conversationService} from "../api/conversationService.ts";
import type {ServiceResponse, TimelineMessageDto} from "../api/types.ts";

export interface PinMessageVariables {
  idempotencyKey: string;
  conversationId: string;
  messageId: string;
  action: "pin" | "unpin";
}

export default function usePinMessage(
  options: Omit<UseMutationOptions<ServiceResponse<TimelineMessageDto>, Error, PinMessageVariables, unknown>, "mutationFn">
) {
  return useMutation<ServiceResponse<TimelineMessageDto>, Error, PinMessageVariables, unknown>({
    ...options,
    mutationFn: async (variables: PinMessageVariables, _context: MutationFunctionContext) => {
      return conversationService.pinMessage(
        variables.idempotencyKey,
        variables.conversationId,
        variables.messageId,
        variables.action,
      );
    },
  });
}