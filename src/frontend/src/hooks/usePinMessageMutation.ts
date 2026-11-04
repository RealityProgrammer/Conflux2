import {type MutationFunctionContext, useMutation, type UseMutationOptions} from "@tanstack/react-query";
import {conversationService} from "../api/conversationService.ts";
import type {ServiceResponse, TimelineMessageDto} from "../api/types.ts";

export interface PinMessageVariables {
  idempotencyKey: string;
  conversationId: string;
  messageId: string;
  action: "pin" | "unpin";
}

export default function usePinMessageMutation(
  options?: Omit<UseMutationOptions<ServiceResponse<TimelineMessageDto>, Error, PinMessageVariables>, "mutationFn" | "mutationKey">
) {
  return useMutation<ServiceResponse<TimelineMessageDto>, Error, PinMessageVariables, unknown>({
    mutationKey: usePinMessageMutation.key,
    mutationFn: async (variables: PinMessageVariables, _context: MutationFunctionContext) => {
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

usePinMessageMutation.key = ["usePinMessageMutation"]