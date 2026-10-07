import {createContext, type ReactNode, useContext, useState} from "react";
import type {MessageInput} from "../components/chat/ChatInput.tsx";
import type {
  ServiceResponse,
  TimelineMessageDto,
} from "../api/types.ts";
import {useMutation} from "@tanstack/react-query";
import {conversationService} from "../api/conversationService.ts";
import {toast} from "react-toastify";
import {useMessageOperationsStore} from "../store/useMessageOperationsStore.ts";
import useTimelineMessageMutations from "../hooks/useTimelineMessageMutations.ts";

type SendMessagePayload = { operationId: string, input: MessageInput, idempotencyKey: string; };
type EditMessagePayload = { messageId: string, newBody: string | null };
type DeleteMessagePayload = { messageId: string };

interface ChatContainerContextType {
  conversationId: string;

  jumpMessageId: string | null;
  requestJump: (messageId: string) => void;
  clearJump: () => void;

  replyingMessage: TimelineMessageDto | null;
  setReplyingMessage: (message: TimelineMessageDto | null) => void;

  handleSendMessage: (messageInput: MessageInput) => void;
  handleEditMessage: (originalMessage: TimelineMessageDto, newBody: string | null) => void;
  handleDeleteMessage: (originalMessage: TimelineMessageDto) => void;

  retrySendOperation: (operationId: string) => void;
  removeSendOperation: (operationId: string) => void;

  retryEditOperation: (messageId: string) => void;
  removeEditOperation: (messageId: string) => void;
}

const ChatContainerContext = createContext<ChatContainerContextType | null>(null);

interface ChatContainerContextProviderProps {
  conversationId: string;
  children: ReactNode;
}

export default function ChatContainerContextProvider({
  conversationId,
  children,
}: ChatContainerContextProviderProps) {
  const [replyingMessage, setReplyingMessage] = useState<TimelineMessageDto | null>(null);
  const [jumpMessageId, setJumpMessageId] = useState<string | null>(null);

  const requestJump = (messageId: string) => setJumpMessageId(messageId);
  const clearJump = () => setJumpMessageId(null);

  const sendOperations = useMessageOperationsStore((state) => state.sendOperations);
  const addSendOperation = useMessageOperationsStore((state) => state.addSendOperation);
  const updateSendOperation = useMessageOperationsStore((state) => state.updateSendOperation);
  const removeSendOperation = useMessageOperationsStore((state) => state.removeSendOperation);

  const { appendMessage, updateMessage, deleteMessage } = useTimelineMessageMutations(conversationId);

  // message mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: SendMessagePayload): Promise<ServiceResponse<TimelineMessageDto>> => {
      return await conversationService.sendMessage(
        conversationId!,
        payload.idempotencyKey,
        payload.input.messageBody,
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
        error: false,
      });
    },
    onSuccess: async (result: ServiceResponse<TimelineMessageDto>, payload: SendMessagePayload) => {
      if (result.success) {
        removeSendOperation(payload.operationId);
        appendMessage(result.data!);
      } else {
        updateSendOperation(payload.operationId, true);
      }
    },
    onError: (_error, payload) => {
      updateSendOperation(payload.operationId, true);
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
  const updateEditOperation = useMessageOperationsStore((state) => state.updateEditOperation);
  const removeEditOperation = useMessageOperationsStore((state) => state.removeEditOperation);

  const editMessageMutation = useMutation({
    mutationFn: async (payload: EditMessagePayload): Promise<ServiceResponse<TimelineMessageDto>> => {
      return await conversationService.editMessage(conversationId, payload.messageId, payload.newBody);
    },
    onMutate: async (payload: EditMessagePayload) => {
      addEditOperation(payload.messageId, payload.newBody);
    },
    onSuccess: async (result: ServiceResponse<TimelineMessageDto>, payload: EditMessagePayload) => {
      if (result.success) {
        removeEditOperation(payload.messageId);
        updateMessage(payload.messageId, result.data!);
      } else {
        updateEditOperation(payload.messageId, true);
        toast.error("Failed to edit message.");
      }
    },
    onError: (_error, payload) => {
      updateEditOperation(payload.messageId, true);
      toast.error("Failed to edit message.");
    },
  });

  const retryEditOperation = (messageId: string) => {
    const op = editOperations[messageId];
    if (!op) return;

    editMessageMutation.mutate({messageId, newBody: op.newBody});
  };

  const addDeletingMessage = useMessageOperationsStore((state) => state.addDeletingMessage);
  const removeDeletingMessage = useMessageOperationsStore((state) => state.removeDeletingMessage);

  const deleteMessageMutation = useMutation({
    mutationFn: async (payload: DeleteMessagePayload): Promise<ServiceResponse> => {
      return await conversationService.deleteMessage(conversationId, payload.messageId);
    },
    onMutate: async (payload: DeleteMessagePayload) => {
      addDeletingMessage(payload.messageId);
    },
    onSuccess: async (result: ServiceResponse, payload: DeleteMessagePayload) => {
      if (result.success) {
        deleteMessage(payload.messageId);
      } else {
        toast.error("Failed to delete message.");
      }
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

  const handleEditMessage = async (originalMessage: TimelineMessageDto, newBody: string | null) => {
    if (!conversationId) return;

    editMessageMutation.mutate({
      messageId: originalMessage.id,
      newBody
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