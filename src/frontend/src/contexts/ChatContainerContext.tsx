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
import {messageService} from "../api/messageService.ts";
import {MessageLoadDirection} from "../api/schema.ts";
import {toast} from "react-toastify";

const LOAD_COUNT = 50;

type SendingMessageOperation = {
  operationId: string;
  input: MessageInput;
  idempotencyKey: string;
  error: boolean;
};

type EditingMessageOperation = {
  newBody: string | null;
  error: boolean;
}

type SendMessagePayload = { operationId: string, input: MessageInput, idempotencyKey: string };
type EditMessagePayload = { messageId: string, newBody: string | null };
type DeleteMessagePayload = { operationId: string, messageId: string };

interface ChatContainerContextType {
  conversationId: string;
  replyingMessage: TimelineMessageDto | null;

  setReplyingMessage: (message: TimelineMessageDto | null) => void;

  messageQueryResult: UseInfiniteQueryResult<InfiniteData<TimelineMessagePage | null | undefined>>;

  appendMessage: (newMessage: TimelineMessageDto, userProfile?: UserIdentityProfileDto) => void;
  editMessage: (messageId: string, newBody: string | null) => void;
  deleteMessage: (messageId: string) => void;

  handleSendMessage: (messageInput: MessageInput) => void;
  handleEditMessage: (originalMessage: TimelineMessageDto, newBody: string | null) => void;
  handleDeleteMessage: (originalMessage: TimelineMessageDto) => void;

  sendingMessageOperations: SendingMessageOperation[];
  retrySendingOperation: (operationId: string) => void;
  removeSendingOperation: (operationId: string) => void;

  deletingMessageIds: Set<string>;

  editingOperations: Map<string, EditingMessageOperation>;
  retryEditingOperation: (messageId: string) => void;
  removeEditingOperation: (messageId: string) => void;
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
      const response = await messageService.getTimelineMessages(
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

  const editMessage = (messageId: string, newBody: string | null) => {
    modifyMessageData((oldData: InfiniteData<TimelineMessagePage | null | undefined>): InfiniteData<TimelineMessagePage | null | undefined> => {
      if (!oldData || !oldData.pages || oldData.pages.length === 0) return oldData;

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
            messages: page.messages.map(m => m.id === messageId ?
              {...m, body: newBody} :
              m
            ),
          };
        }),
      };
    });
  };

  const deleteMessage = (messageId: string) => {
    modifyMessageData((oldData: InfiniteData<TimelineMessagePage | null | undefined>): InfiniteData<TimelineMessagePage | null | undefined> => {
      if (!oldData || !oldData.pages || oldData.pages.length === 0) return oldData;

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

  const [sendingMessageOperations, setSendingMessageOperations] = useState<SendingMessageOperation[]>([]);

  // message mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: SendMessagePayload): Promise<ServiceResponse<TimelineMessageDto>> => {
      return await messageService.sendMessage(
        conversationId!,
        payload.idempotencyKey,
        payload.input.messageBody,
        payload.input.attachments,
        payload.input.replyingMessage?.id
      );
    },
    onMutate: async (payload: SendMessagePayload) => {
      setSendingMessageOperations((prev) => {
        // check if this is a retry
        const isRetry = prev.some(op => op.operationId === payload.operationId && op.error);

        if (isRetry) {
          return prev.map(op =>
            op.operationId === payload.operationId ? { ...op, error: false } : op
          );
        }

        return [...prev, {
          operationId: payload.operationId,
          input: payload.input,
          idempotencyKey: payload.idempotencyKey,
          error: false,
        }];
      });
    },
    onSuccess: async (result: ServiceResponse<TimelineMessageDto>, payload: SendMessagePayload) => {
      if (result.success) {
        appendMessage(result.data!);
        setSendingMessageOperations((prev) => prev.filter(m => m.operationId !== payload.operationId));
      } else {
        setSendingMessageOperations((prev) => prev.map(op =>
          op.operationId === payload.operationId ? { ...op, error: true } : op
        ));
      }
    },
    onError: (_error, payload) => {
      setSendingMessageOperations((prev) =>
        prev.map(op =>
          op.operationId === payload.operationId ? { ...op, error: true } : op
        )
      );
    },
  });

  const retrySendingOperation = (operationId: string) => {
    const operation = sendingMessageOperations.find(o => o.operationId === operationId && o.error);
    if (!operation) return;

    sendMessageMutation.mutate({
      operationId: operationId,
      idempotencyKey: operation.idempotencyKey,
      input: operation.input,
    });
  };

  const removeSendingOperation = (operationId: string) => {
    setSendingMessageOperations((prev) => prev.filter(o => o.operationId !== operationId));
  };

  // TODO: switch value to MessageInput once we have attachments editing
  const [editingOperations, setEditingOperations] = useState<Map<string, EditingMessageOperation>>(new Map());

  const editMessageMutation = useMutation({
    mutationFn: async (payload: EditMessagePayload): Promise<ServiceResponse<TimelineMessageDto>> => {
      return await messageService.editMessage(conversationId, payload.messageId, payload.newBody);
    },
    onMutate: async (payload: EditMessagePayload) => {
      setEditingOperations((prev) => {
        return new Map(prev).set(payload.messageId, {newBody: payload.newBody, error: false});
      });
    },
    onSuccess: async (result: ServiceResponse<TimelineMessageDto>, payload: EditMessagePayload) => {
      if (!result.success) {
        setEditingOperations((prev) => {
          const op = prev.get(payload.messageId);
          if (!op) return prev;

          const next = new Map(prev);
          next.delete(payload.messageId);
          return next.set(payload.messageId, { ...op, error: true });
        });

        toast.error("Failed to edit message.");
        return;
      }

      editMessage(payload.messageId, payload.newBody);
      setEditingOperations((prev) => {
        const next = new Map(prev);
        next.delete(payload.messageId);
        return next;
      });
    },
    onError: (_error, payload) => {
      setEditingOperations((prev) => {
        const op = prev.get(payload.messageId);
        if (!op) return prev;

        const next = new Map(prev);
        next.delete(payload.messageId);
        return next.set(payload.messageId, { ...op, error: true });
      });

      toast.error("Failed to edit message.");
    },
  });

  const retryEditingOperation = (messageId: string) => {
    const op = editingOperations.get(messageId);
    if (!op) return;

    editMessageMutation.mutate({
      messageId,
      newBody: op.newBody,
    });
  };

  const removeEditingOperation = (messageId: string) => {
    setEditingOperations((prev) => {
      const next = new Map(prev);
      next.delete(messageId);
      return next;
    });
  };

  const [deletingMessageIds, setDeletingMessageIds] = useState<Set<string>>(new Set());

  const deleteMessageMutation = useMutation({
    mutationFn: async (payload: DeleteMessagePayload): Promise<ServiceResponse> => {
      return await messageService.deleteMessage(conversationId, payload.messageId);
    },
    onMutate: async (payload: DeleteMessagePayload) => {
      setDeletingMessageIds((prev) => new Set(prev).add(payload.messageId));
    },
    onSuccess: async (result: ServiceResponse, payload: DeleteMessagePayload) => {
      if (!result.success) {
        // TODO: Jump to the message when click on the toast.
        toast.error("Failed to delete message.");
      } else {
        deleteMessage(payload.messageId);
      }
    },
    onError: (_error, _payload) => {
      toast.error("Failed to delete message.");
    },
    onSettled: (_data, _error, payload) => {
      setDeletingMessageIds((prev) => {
        const next = new Set(prev);
        next.delete(payload.messageId);
        return next;
      });
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
      editMessage,
      deleteMessage,
      handleSendMessage,
      handleEditMessage,
      handleDeleteMessage,
      sendingMessageOperations,
      removeSendingOperation,
      retrySendingOperation,
      deletingMessageIds,
      editingOperations,
      retryEditingOperation,
      removeEditingOperation,
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