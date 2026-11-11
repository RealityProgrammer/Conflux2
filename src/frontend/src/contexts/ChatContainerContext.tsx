import {createContext, type ReactNode, useContext, useEffect, useState} from "react";
import type {MessageInput} from "../components/chat/ChatInput.tsx";
import type {
  BackendResponse,
  EditedMessageDto,
  ServiceResponse,
  TimelineMessageDto,
} from "../api/types.ts";
import {useMutation} from "@tanstack/react-query";
import {conversationService} from "../api/conversationService.ts";
import {toast} from "react-toastify";
import {useMessageOperationsStore} from "../store/useMessageOperationsStore.ts";
import useTimelineMessageMutations from "../hooks/useTimelineMessageMutations.ts";
import {useActiveConversationStore} from "../store/useActiveConversationStore.ts";
import {useConversationContext} from "./ConversationContext.tsx";
import {type AxiosError, HttpStatusCode} from "axios";
import {handleAxiosError} from "../api/errorHandling.ts";

type SendMessagePayload = { operationId: string, input: MessageInput, idempotencyKey: string; };
type EditMessagePayload = { messageId: string, newBody: string | null, removeAttachmentIds: string[]; newAttachments: File[] };
type DeleteMessagePayload = { messageId: string };

interface ChatContainerContextType {
  conversationId: string;

  jumpMessageId: string | null;
  requestJump: (messageId: string) => void;
  clearJump: () => void;

  replyingMessage: TimelineMessageDto | null;
  setReplyingMessage: (message: TimelineMessageDto | null) => void;

  handleSendMessage: (messageInput: MessageInput) => void;
  handleEditMessage: (originalMessage: TimelineMessageDto, newBody: string | null, removeAttachmentIds: string[], newAttachments: File[]) => void;
  handleDeleteMessage: (originalMessage: TimelineMessageDto) => void;

  retrySendOperation: (operationId: string) => void;
  removeSendOperation: (operationId: string) => void;

  retryEditOperation: (messageId: string) => void;
  removeEditOperation: (messageId: string) => void;
}

const ChatContainerContext = createContext<ChatContainerContextType | null>(null);

export default function ChatContainerContextProvider({
  children,
}: {children: ReactNode}) {
  const { detailsQuery } = useConversationContext();

  if (!detailsQuery!.isSuccess) {
    throw new Error("ChatContainerContextProvider can only be used if conversation details query has success query.");
  }

  const conversationId = detailsQuery?.data?.conversationId!;

  const setActiveConversationId = useActiveConversationStore((state) => state.setActiveConversationId);

  useEffect(() => {
    if (!detailsQuery || !detailsQuery.data) {
      setActiveConversationId(null);
      return;
    }

    setActiveConversationId(detailsQuery.data.conversationId);

    return () => {
      setActiveConversationId(null);
    };
  }, [detailsQuery, setActiveConversationId]);

  const [replyingMessage, setReplyingMessage] = useState<TimelineMessageDto | null>(null);
  const [jumpMessageId, setJumpMessageId] = useState<string | null>(null);

  const requestJump = (messageId: string) => setJumpMessageId(messageId);
  const clearJump = () => setJumpMessageId(null);

  const sendOperations = useMessageOperationsStore((state) => state.sendOperations);
  const addSendOperation = useMessageOperationsStore((state) => state.addSendOperation);
  const setSendOperationError = useMessageOperationsStore((state) => state.setSendOperationError);
  const removeSendOperation = useMessageOperationsStore((state) => state.removeSendOperation);

  const { appendMessage, updateMessage, deleteMessage } = useTimelineMessageMutations(conversationId);

  // message mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: SendMessagePayload): Promise<TimelineMessageDto> => {
      return await conversationService.sendMessage(
        conversationId!,
        payload.idempotencyKey,
        payload.input.body,
        payload.input.attachments,
        payload.input.replyingMessage?.id
      );
    },
    onMutate: async (payload: SendMessagePayload) => {
      addSendOperation({
        id: payload.operationId,
        idempotencyKey: payload.idempotencyKey,
        input: payload.input,
        conversationId,
      });
    },
    onSuccess: async (result: TimelineMessageDto, payload: SendMessagePayload) => {
      removeSendOperation(payload.operationId);
      appendMessage(result);
    },
    onError: (error: AxiosError<BackendResponse>, payload: SendMessagePayload) => {
      toast.error("Failed to send message.");

      const response: ServiceResponse = handleAxiosError(error);

      switch (response.statusCode) {
        case HttpStatusCode.BadRequest:
          if (response.error?.code === "ValidationErrorsOccurred") {
            const details = response.error.details as Record<"body" | "attachments", string[]>;

            setSendOperationError(payload.operationId, {
              type: "validation",
              fields: {
                attachments: details.attachments,
                body: details.body,
              }
            });
          } else {
            setSendOperationError(payload.operationId, { type: "unknown" });
          }
          break;

        case 0 as HttpStatusCode:
          setSendOperationError(payload.operationId, { type: "network" });
          break;

        default:
          setSendOperationError(payload.operationId, { type: "unknown" });
          break;
      }
    },
  });

  const retrySendingOperation = (operationId: string) => {
    const operation = sendOperations.find(o => o.id === operationId && o.error);
    if (!operation) return;

    sendMessageMutation.mutate({
      operationId: operationId,
      idempotencyKey: operation.idempotencyKey,
      input: operation.input,
    });
  };

  // TODO: switch value to MessageInput once we have attachments editing
  const editOperations = useMessageOperationsStore((state) => state.editOperations);
  const addEditOperation = useMessageOperationsStore((state) => state.addEditOperation);
  const setEditOperationError = useMessageOperationsStore((state) => state.setEditOperationError);
  const removeEditOperation = useMessageOperationsStore((state) => state.removeEditOperation);

  const editMessageMutation = useMutation({
    mutationFn: async (payload: EditMessagePayload): Promise<EditedMessageDto> => {
      return await conversationService.editMessage(conversationId, payload.messageId, payload.newBody, payload.removeAttachmentIds, payload.newAttachments);
    },
    onMutate: async (payload: EditMessagePayload) => {
      addEditOperation(payload.messageId, payload.newBody, payload.removeAttachmentIds, payload.newAttachments);
    },
    onSuccess: async (result: EditedMessageDto, payload: EditMessagePayload) => {
      removeEditOperation(payload.messageId);
      updateMessage(payload.messageId, { newBody: result.newBody, attachments: result.attachments });
    },
    onError: (error: AxiosError<BackendResponse>, payload: EditMessagePayload) => {
      toast.error("Failed to edit message.");

      const response: ServiceResponse = handleAxiosError(error);

      switch (response.statusCode) {
        case HttpStatusCode.BadRequest:
          if (response.error?.code === "ValidationErrorsOccurred") {
            const details = response.error.details as Record<"body" | "attachments", string[]>;

            setEditOperationError(payload.messageId, {
              type: "validation",
              fields: {
                attachments: details.attachments,
                body: details.body,
              }
            });
          } else {
            setEditOperationError(payload.messageId, { type: "unknown" });
          }
          break;

        case 0 as HttpStatusCode:
          setEditOperationError(payload.messageId, { type: "network" });
          break;

        default:
          setEditOperationError(payload.messageId, { type: "unknown" });
          break;
      }
    },
  });

  const retryEditOperation = (messageId: string) => {
    const op = editOperations[messageId];
    if (!op) return;

    editMessageMutation.mutate({messageId, newBody: op.newBody, removeAttachmentIds: op.removeAttachmentIds, newAttachments: op.newAttachments});
  };

  const addDeletingMessage = useMessageOperationsStore((state) => state.addDeletingMessage);
  const removeDeletingMessage = useMessageOperationsStore((state) => state.removeDeletingMessage);

  const deleteMessageMutation = useMutation({
    mutationFn: async (payload: DeleteMessagePayload): Promise<void> => {
      await conversationService.deleteMessage(conversationId, payload.messageId);
    },
    onMutate: async (payload: DeleteMessagePayload) => {
      addDeletingMessage(payload.messageId);
    },
    onSuccess: async (_result: void, payload: DeleteMessagePayload) => {
      deleteMessage(payload.messageId);
    },
    onError: (_error, _payload) => {
      toast.error("Failed to delete message.");
    },
    onSettled: (_data, _error, payload) => {
      removeDeletingMessage(payload.messageId);
    },
  });

  // messaging operation
  const handleSendMessage = async (state: MessageInput) => {
    if (!conversationId) return;

    const operationId = `__queue_message-${crypto.randomUUID()}`;
    const idempotencyKey = crypto.randomUUID();
    sendMessageMutation.mutate({operationId, input: state, idempotencyKey});

    setReplyingMessage(null);
  };

  const handleEditMessage = async (originalMessage: TimelineMessageDto, newBody: string | null, removeAttachmentIds: string[], newAttachments: File[]) => {
    if (!conversationId) return;

    editMessageMutation.mutate({
      messageId: originalMessage.id,
      newBody,
      removeAttachmentIds,
      newAttachments
    });
  };

  const handleDeleteMessage = async (message: TimelineMessageDto) => {
    if (!conversationId) return;

    deleteMessageMutation.mutate({
      messageId: message.id
    });
  };

  return (
    <ChatContainerContext.Provider value={{
      conversationId,
      jumpMessageId,
      requestJump,
      clearJump,
      replyingMessage,
      setReplyingMessage,
      handleSendMessage,
      handleEditMessage,
      handleDeleteMessage,
      removeSendOperation,
      retrySendOperation: retrySendingOperation,
      retryEditOperation,
      removeEditOperation,
    }}>
      {children}
    </ChatContainerContext.Provider>
  )
}

export function useChatContainerContext(): ChatContainerContextType {
  const context = useContext(ChatContainerContext);
  if (!context) throw new Error("useChatContainerContext must be used within an ChatContainerContextProvider.");

  return context;
}