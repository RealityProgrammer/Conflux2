import {createContext, type ReactNode, useContext, useState} from "react";
import type {MessageInput} from "../components/chat/ChatInput.tsx";
import type {
  ServiceResponse,
  TimelineMessagePage,
  TimelineMessageDto,
  UserIdentityProfileDto
} from "../api/types.ts";
import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  useMutation, useQueryClient
} from "@tanstack/react-query";
import {conversationService} from "../api/conversationService.ts";
import {MessageLoadDirection} from "../api/schema.ts";
import {toast} from "react-toastify";
import {useMessageOperationsStore} from "../store/useMessageOperationsStore.ts";

const LOAD_COUNT = 50;

type SendMessagePayload = { operationId: string, input: MessageInput, idempotencyKey: string; };
type EditMessagePayload = { messageId: string, newBody: string | null };
type DeleteMessagePayload = { operationId: string, messageId: string };

interface ChatContainerContextType {
  conversationId: string;
  replyingMessage: TimelineMessageDto | null;

  setReplyingMessage: (message: TimelineMessageDto | null) => void;

  messageQueryResult: UseInfiniteQueryResult<InfiniteData<TimelineMessagePage | null | undefined>>;

  appendMessage: (newMessage: TimelineMessageDto, userProfile?: UserIdentityProfileDto) => void;
  updateMessage: (messageId: string, properties: Partial<Omit<TimelineMessageDto, "id" | "type" | "conversationId">>) => void;
  deleteMessage: (messageId: string) => void;

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
  type PageParams = {
    cursorId?: string;
    direction: MessageLoadDirection;
  }

  const [replyingMessage, setReplyingMessage] = useState<TimelineMessageDto | null>(null);

  const queryKey: QueryKey = ["conversation", conversationId];

  const messageQueryResult = useInfiniteQuery({
    enabled: !!conversationId,
    queryKey,
    queryFn: async ({pageParam}: { pageParam: PageParams }): Promise<TimelineMessagePage | null | undefined> => {
      const response = await conversationService.getTimelineMessages(
        conversationId!,
        pageParam.direction,
        pageParam.cursorId,
        LOAD_COUNT,
      );

      return response.data;
    },
    initialPageParam: {
      cursorId: undefined,
      direction: MessageLoadDirection.Before,
    },

    getPreviousPageParam: (firstPage: TimelineMessagePage | null | undefined): PageParams | undefined => {
      return firstPage?.hasMoreBefore && firstPage.messages.length > 0 ? {
        cursorId: firstPage.messages[0].id,
        direction: MessageLoadDirection.Before,
      } : undefined;
    },

    getNextPageParam: (lastPage: TimelineMessagePage | null | undefined): PageParams | undefined => {
      return lastPage?.hasMoreAfter && lastPage.messages.length > 0 ? {
        cursorId: lastPage.messages.at(-1)?.id,
        direction: MessageLoadDirection.After,
      } : undefined;
    },

    staleTime: 60 * 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const queryClient = useQueryClient();

  const modifyMessageData = (callback: (oldData: InfiniteData<TimelineMessagePage | null | undefined>) => InfiniteData<TimelineMessagePage | null | undefined>) => {
    queryClient.setQueryData<InfiniteData<TimelineMessagePage | undefined | null>>(
      queryKey,
      (oldData: NoInfer<InfiniteData<TimelineMessagePage | null | undefined>> | undefined): NoInfer<InfiniteData<TimelineMessagePage | null | undefined>> | undefined => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return oldData;
        }

        return callback(oldData);
      }
    );
  }

  const appendMessage = (newMessage: TimelineMessageDto) => {
    modifyMessageData((oldData: InfiniteData<TimelineMessagePage | null | undefined>): InfiniteData<TimelineMessagePage | null | undefined> => {
      if (!oldData || !oldData.pages || oldData.pages.length === 0) return oldData;

      return {
        ...oldData,
        pages: [
          ...oldData.pages.slice(0, -1),
          {
            ...oldData.pages[oldData.pages.length - 1]!,
            messages: [
              ...oldData.pages[oldData.pages.length - 1]!.messages,
              newMessage,
            ]
          }
        ]
      };
    });
  };

  const updateMessage = (messageId: string, properties: Partial<Omit<TimelineMessageDto, "id" | "type" | "conversationId">>) => {
    modifyMessageData((oldData: InfiniteData<TimelineMessagePage | null | undefined>): InfiniteData<TimelineMessagePage | null | undefined> => {
      let hasMessage = false;
      for (const page of oldData.pages) {
        if (!page) continue;

        hasMessage = page.messages.some(m => m.id === messageId);
        if (hasMessage) break;
      }

      if (!hasMessage) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: TimelineMessagePage | null | undefined) => {
          if (!page || !page.messages.some(m => m.id === messageId)) {
            return page;
          }

          return {
            ...page,
            messages: page.messages.map(m => m.id === messageId ?
              {...m, ...properties} :
              m
            ),
          };
        }),
      };
    });
  };

  const deleteMessage = (messageId: string) => {
    modifyMessageData((oldData: InfiniteData<TimelineMessagePage | null | undefined>): InfiniteData<TimelineMessagePage | null | undefined> => {
      let isMessageFound = false;
      for (const page of oldData.pages) {
        if (!page) continue;

        isMessageFound = page.messages.some(m => m.id === messageId);
        if (isMessageFound) break;
      }

      if (!isMessageFound) return oldData;

      return {
        ...oldData,
        pages: oldData.pages.map((page: TimelineMessagePage | null | undefined) => {
          if (!page || !page.messages.some(m => m.id === messageId)) {
            return page;
          }

          return {
            ...page,
            messages: page.messages.filter(m => m.id !== messageId),
          };
        }),
      };
    });
  };

  const sendOperations = useMessageOperationsStore((state) => state.sendOperations);
  const addSendOperation = useMessageOperationsStore((state) => state.addSendOperation);
  const updateSendOperation = useMessageOperationsStore((state) => state.updateSendOperation);
  const removeSendOperation = useMessageOperationsStore((state) => state.removeSendOperation);

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
        appendMessage(result.data!);
        removeSendOperation(payload.operationId);
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
      if (!result.success) {
        updateEditOperation(payload.messageId, true);
        toast.error("Failed to edit message.");
        return;
      }

      updateMessage(payload.messageId, { body: payload.newBody });
      removeEditOperation(payload.messageId);
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
        // TODO: Jump to the message when click on the toast.
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

    const operationId = `__queue_message-${crypto.randomUUID()}`;
    deleteMessageMutation.mutate({
      operationId,
      messageId: message.id
    });
  };

  return (
    <ChatContainerContext.Provider value={{
      conversationId,
      replyingMessage,
      setReplyingMessage,
      messageQueryResult,
      appendMessage,
      updateMessage,
      deleteMessage,
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