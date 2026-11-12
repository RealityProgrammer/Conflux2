import {createContext, type ReactNode, useContext, useEffect, useState} from "react";
import type {
  BackendResponse,
  EditedMessageDto,
  ServiceResponse,
  TimelineMessageDto,
} from "../api/types.ts";
import {toast} from "react-toastify";
import {
  type MessageEditInput,
  type MessageSendInput,
  useMessageOperationsStore
} from "../store/useMessageOperationsStore.ts";
import useTimelineMessageMutations from "../hooks/useTimelineMessageMutations.ts";
import {useActiveConversationStore} from "../store/useActiveConversationStore.ts";
import {useConversationContext} from "./ConversationContext.tsx";
import {type AxiosError, HttpStatusCode} from "axios";
import {handleAxiosError} from "../api/errorHandling.ts";
import useSendMessageMutation, {type UseSendMessageMutationVariables} from "../hooks/useSendMessageMutation.ts";
import useEditMessageMutation, {type UseEditMessageMutationVariables} from "../hooks/useEditMessageMutation.ts";
import useDeleteMessageMutation, {type UseDeleteMessageMutationVariables} from "../hooks/useDeleteMessageMutation.ts";

interface ChatContainerContextType {
  conversationId: string;

  jumpMessageId: string | null;
  requestJump: (messageId: string) => void;
  clearJump: () => void;

  replyingMessage: TimelineMessageDto | null;
  setReplyingMessage: (message: TimelineMessageDto | null) => void;

  handleSendMessage: (input: MessageSendInput) => void;
  handleEditMessage: (messageId: string, input: MessageEditInput) => void;
  handleDeleteMessage: (messageId: string) => void;

  retrySendOperation: (idempotencyKey: string) => void;
  removeSendOperation: (idempotencyKey: string) => void;

  retryEditOperation: (messageId: string) => void;
  removeEditOperation: (operationIdempotencyKey: string) => void;
}

const ChatContainerContext = createContext<ChatContainerContextType | null>(null);

export default function ChatContainerContextProvider({
  children,
}: {children: ReactNode}) {
  const { detailsQuery } = useConversationContext();

  if (!detailsQuery!.isSuccess) {
    throw new Error("ChatContainerContextProvider can only be used if conversation details query has success query.");
  }

  // set active conversation id
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

  // setup some states
  const [replyingMessage, setReplyingMessage] = useState<TimelineMessageDto | null>(null);
  const [jumpMessageId, setJumpMessageId] = useState<string | null>(null);

  const requestJump = (messageId: string) => setJumpMessageId(messageId);
  const clearJump = () => setJumpMessageId(null);

  const {
    addSendOperation,
    setSendOperationError,
    removeSendOperation,
    addEditOperation,
    setEditOperationError,
    removeEditOperation,
    addDeletingMessage,
    removeDeletingMessage,
  } = useMessageOperationsStore();

  const sendOperations = useMessageOperationsStore(
    (state) => state.sendOperationsByConversation[conversationId]
  ) || [];
  const editOperations = useMessageOperationsStore(
    (state) => state.editOperationsByConversation[conversationId]
  ) || {};

  const { appendMessage, updateMessage, deleteMessage } = useTimelineMessageMutations(conversationId);

  // message mutations
  const sendMessageMutation = useSendMessageMutation({
    onMutate: async (variables: UseSendMessageMutationVariables) => {
      addSendOperation(conversationId, {
        idempotencyKey: variables.idempotencyKey,
        input: variables.input,
        conversationId,
      });
    },
    onSuccess: async (result: TimelineMessageDto, variables: UseSendMessageMutationVariables) => {
      removeSendOperation(conversationId, variables.idempotencyKey);
      appendMessage(result);
    },
    onError: (error: Error, variables: UseSendMessageMutationVariables) => {
      toast.error("Failed to send message.");

      const response: ServiceResponse = handleAxiosError(error as AxiosError<BackendResponse>);

      switch (response.statusCode) {
        case HttpStatusCode.BadRequest:
          if (response.error?.code === "ValidationErrorsOccurred") {
            const details = response.error.details as Record<string, string[]>;

            setSendOperationError(conversationId, variables.idempotencyKey, {
              type: "validation",
              messages: Object.values(details).flatMap(p => p),
            });
          } else {
            setSendOperationError(conversationId, variables.idempotencyKey, { type: "unknown" });
          }
          break;

        case 0 as HttpStatusCode:
          setSendOperationError(conversationId, variables.idempotencyKey, { type: "network" });
          break;

        default:
          setSendOperationError(conversationId, variables.idempotencyKey, { type: "unknown" });
          break;
      }
    },
  });

  const retrySendOperation = (idempotencyKey: string) => {
    const operation = sendOperations.find(o => o.idempotencyKey === idempotencyKey && o.error);
    if (!operation) return;

    sendMessageMutation.mutate({
      conversationId,
      input: operation.input,
      idempotencyKey: operation.idempotencyKey,
    });
  };

  const editMessageMutation = useEditMessageMutation({
    onMutate: async (variables: UseEditMessageMutationVariables) => {
      addEditOperation(conversationId, variables.messageId, {
        body: variables.body,
        removeAttachmentIds: variables.removeAttachmentIds,
        addAttachments: variables.addAttachments
      });
    },
    onSuccess: async (result: EditedMessageDto, variables: UseEditMessageMutationVariables) => {
      removeEditOperation(conversationId, variables.messageId);
      updateMessage(variables.messageId, { newBody: result.newBody, attachments: result.attachments });
    },
    onError: (error: Error, variables: UseEditMessageMutationVariables) => {
      toast.error("Failed to edit message.");

      const response: ServiceResponse = handleAxiosError(error as AxiosError<BackendResponse>);

      switch (response.statusCode) {
        case HttpStatusCode.BadRequest:
          if (response.error?.code === "ValidationErrorsOccurred") {
            const details = response.error.details as Record<"body" | "removeAttachmentIds" | "addAttachments", string[]>;

            setEditOperationError(conversationId, variables.messageId, {
              type: "validation",
              messages: Object.values(details).flatMap(p => p),
            });
          } else {
            setEditOperationError(conversationId, variables.messageId, { type: "unknown" });
          }
          break;

        case 0 as HttpStatusCode:
          setEditOperationError(conversationId, variables.messageId, { type: "network" });
          break;

        default:
          setEditOperationError(conversationId, variables.messageId, { type: "unknown" });
          break;
      }
    },
  });

  const retryEditOperation = (messageId: string) => {
    const op = editOperations[messageId];
    if (!op || !op.error) return;

    editMessageMutation.mutate({
      conversationId,
      messageId,
      ...op.input,
    });
  };

  const deleteMessageMutation = useDeleteMessageMutation({
    onMutate: async (payload: UseDeleteMessageMutationVariables) => {
      addDeletingMessage(conversationId, payload.messageId);
    },
    onSuccess: async (_result: void, payload: UseDeleteMessageMutationVariables) => {
      deleteMessage(payload.messageId);
    },
    onError: (_error, _payload) => {
      toast.error("Failed to delete message.");
    },
    onSettled: (_data, _error, payload) => {
      removeDeletingMessage(conversationId, payload.messageId);
    },
  });

  // messaging operation
  const handleSendMessage = async (state: MessageSendInput) => {
    if (!conversationId) return;

    sendMessageMutation.mutate({
      conversationId,
      input: state,
      idempotencyKey: crypto.randomUUID(),
    });

    setReplyingMessage(null);
  };

  const handleEditMessage = async (messageId: string, input: MessageEditInput) => {
    if (!conversationId) return;

    editMessageMutation.mutate({
      conversationId,
      messageId,
      ...input,
    });
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!conversationId) return;

    deleteMessageMutation.mutate({
      conversationId,
      messageId,
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
      removeSendOperation: (operationIdempotencyKey: string) => {
        removeSendOperation(conversationId, operationIdempotencyKey);
      },
      retrySendOperation,
      retryEditOperation,
      removeEditOperation: (operationIdempotencyKey: string) => {
        removeEditOperation(conversationId, operationIdempotencyKey);
      },
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