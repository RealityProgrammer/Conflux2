import {createContext, type ReactNode, useContext, useState} from "react";
import type {MessageInput} from "../components/chat/ChatInput.tsx";
import type {
  GetMessagesResponse, ServiceResponse,
  TimelineMessageClusterDto,
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
import {useAuthorization} from "./AuthContext.tsx";
import {messageService} from "../api/messageService.ts";
import {HttpStatusCode} from "axios";
import {MessageLoadDirection} from "../api/schema.ts";

const LOAD_COUNT = 50;

type SendingMessageOperation = {
  operationId: string;
  input: MessageInput;
  idempotencyKey: string;
  error: boolean;
};

// type EditMessageOperation = {
//   messageId: string;
//   newBody: string | null;
// };
//
// type DeleteMessageOperation = {
//   messageId: string;
// }
//
// type MessageOperation = {
//   operationId: string;
//   operation: SendingMessageOperation | EditMessageOperation | DeleteMessageOperation | ErrorMessageOperation;
// };

type SendMessagePayload = { operationId: string, input: MessageInput, idempotencyKey: string };
type EditMessagePayload = { operationId: string, messageId: string, newBody: string | null };
type DeleteMessagePayload = { operationId: string, messageId: string };

interface ChatContainerContextType {
  channelId: string;
  replyingMessage: TimelineMessageDto | null;

  setReplyingMessage: (message: TimelineMessageDto | null) => void;

  messageQueryResult: UseInfiniteQueryResult<InfiniteData<GetMessagesResponse | null | undefined>>;
  messageClusters: TimelineMessageClusterDto[];
  userProfiles: Record<string, UserIdentityProfileDto>;

  appendMessage: (newMessage: TimelineMessageDto, userProfile?: UserIdentityProfileDto) => void;
  editMessage: (messageId: string, newBody: string | null) => void;
  deleteMessage: (messageId: string) => void;

  handleSendMessage: (messageInput: MessageInput) => void;
  handleEditMessage: (originalMessage: TimelineMessageDto, newBody: string | null) => void;
  handleDeleteMessage: (originalMessage: TimelineMessageDto) => void;

  sendingMessageOperations: SendingMessageOperation[];
  retrySendingOperation: (operationId: string) => void;
  removeSendingOperation: (operationId: string) => void;
}

const ChatContainerContext = createContext<ChatContainerContextType | null>(null);

interface ChatContainerContextProviderProps {
  channelId: string;
  children: ReactNode;
}

export default function ChatContainerContextProvider({
  channelId,
  children,
}: ChatContainerContextProviderProps) {
  type PageParams = {
    cursorId?: string;
    direction: MessageLoadDirection;
  }

  const authorization = useAuthorization();

  const [replyingMessage, setReplyingMessage] = useState<TimelineMessageDto | null>(null);

  const queryKey: QueryKey = ["channelConversation", channelId];

  const messageQueryResult = useInfiniteQuery({
    enabled: !!channelId,
    queryKey,
    queryFn: async ({pageParam}: { pageParam: PageParams }): Promise<GetMessagesResponse | null | undefined> => {
      const response = await messageService.getMessages(
        channelId!,
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

    getPreviousPageParam: (firstPage: GetMessagesResponse | null | undefined): PageParams | undefined => {
      if (firstPage?.hasMoreBefore && firstPage.messageGroups.length > 0) {
        const oldestMessage = firstPage.messageGroups[0];

        return {
          cursorId: oldestMessage.messages[0].id,
          direction: MessageLoadDirection.Before,
        };
      }

      return undefined;
    },

    getNextPageParam: (lastPage: GetMessagesResponse | null | undefined): PageParams | undefined => {
      if (lastPage?.hasMoreAfter && lastPage.messageGroups.length > 0) {
        return {
          cursorId: lastPage.messageGroups.at(-1)?.messages.at(-1)?.id,
          direction: MessageLoadDirection.After,
        };
      }

      return undefined;
    },

    staleTime: 60 * 30 * 1000,
    refetchOnWindowFocus: false,
  });
  const allMessageClusters: TimelineMessageClusterDto[] = messageQueryResult.data?.pages.flatMap((page) => page?.messageGroups ?? []) ?? [];

  // in allMessageClusters, if end of page N and start of page N+1 have same sender, it is still considered different cluster, so merge them.
  const messageClusters = allMessageClusters.reduce<TimelineMessageClusterDto[]>((acc, currentGroup) => {
    const lastGroup = acc.at(-1);

    if (lastGroup && lastGroup.senderUserId === currentGroup.senderUserId) {
      // replace the last group with a new object containing both element arrays
      acc[acc.length - 1] = {
        ...lastGroup,
        messages: [...lastGroup.messages, ...currentGroup.messages],
      };
    } else {
      // just push the group into the array
      acc.push(currentGroup);
    }

    return acc;
  }, []);

  const userProfiles: Record<string, UserIdentityProfileDto> = {};
  for (const page of messageQueryResult.data?.pages ?? []) {
    if (page?.users) {
      for (const user of page.users) {
        userProfiles[user.id] = user;
      }
    }
  }

  const queryClient = useQueryClient();

  const modifyMessageData = (callback: (oldData: InfiniteData<GetMessagesResponse | null | undefined>) => InfiniteData<GetMessagesResponse | null | undefined>) => {
    queryClient.setQueryData<InfiniteData<GetMessagesResponse | undefined | null>>(
      queryKey,
      (oldData: NoInfer<InfiniteData<GetMessagesResponse | null | undefined>> | undefined): NoInfer<InfiniteData<GetMessagesResponse | null | undefined>> | undefined => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0) {
          return oldData;
        }

        return callback(oldData);
      }
    );
  }

  const appendMessage = (newMessage: TimelineMessageDto, userProfile?: UserIdentityProfileDto) => {
    modifyMessageData((oldData: InfiniteData<GetMessagesResponse | null | undefined>): InfiniteData<GetMessagesResponse | null | undefined> => {
      const lastPage: GetMessagesResponse = oldData.pages.at(-1)!;
      const updatedLastPage: GetMessagesResponse = {...lastPage};

      const existingUsers: UserIdentityProfileDto[] = updatedLastPage.users || [];

      if (userProfile && !existingUsers.some((u: UserIdentityProfileDto) => u.id === userProfile.id)) {
        // @ts-ignore
        updatedLastPage.users = [...existingUsers, userProfile];
      }

      const currentGroups = updatedLastPage.messageGroups || [];

      if (lastPage.messageGroups?.length > 0) {
        const lastMessageGroup = lastPage.messageGroups.at(-1)!;

        // was the new message sent by the same person on the last group of the last page?
        const isSameUser =
          lastMessageGroup.senderUserId == newMessage.senderUserId;

        if (isSameUser) {
          const updatedGroup: TimelineMessageClusterDto = {
            ...lastMessageGroup,
            messages: [...lastMessageGroup.messages, newMessage],
          };

          updatedLastPage.messageGroups = [
            ...currentGroups.slice(0, -1),
            updatedGroup,
          ];
        } else {
          updatedLastPage.messageGroups = [
            ...currentGroups,
            {
              senderUserId: newMessage.senderUserId,
              messages: [newMessage],
            },
          ];
        }
      } else {
        updatedLastPage.messageGroups = [
          {
            senderUserId: newMessage.senderUserId,
            messages: [newMessage],
          },
        ];
      }

      return {
        ...oldData,
        pages: [...oldData.pages.slice(0, -1), updatedLastPage],
      };
    });
  };

  const editMessage = (messageId: string, newBody: string | null) => {
    modifyMessageData((oldData: InfiniteData<GetMessagesResponse | null | undefined>): InfiniteData<GetMessagesResponse | null | undefined> => {
      let isMessageFound = false;

      const updatedPages = oldData.pages.map((page: GetMessagesResponse | null | undefined): GetMessagesResponse | null | undefined => {
        if (!page) return page;

        const updatedMessageGroups = page.messageGroups.map((messageGroup: TimelineMessageClusterDto): TimelineMessageClusterDto => {
          const messageIndex = messageGroup.messages.findIndex((m) => m.id === messageId);

          if (messageIndex !== -1) {
            isMessageFound = true;

            const updatedMessages = [...messageGroup.messages];

            updatedMessages[messageIndex] = {...updatedMessages[messageIndex], body: newBody};

            return {
              ...messageGroup,
              messages: updatedMessages,
            };
          }

          return messageGroup;
        });

        if (!isMessageFound) {
          return page;
        }

        return {
          ...page,
          messageGroups: updatedMessageGroups,
        };
      });

      if (!isMessageFound) {
        return oldData;
      }

      return {
        ...oldData,
        pages: updatedPages,
      };
    });
  };

  const deleteMessage = (messageId: string) => {
    modifyMessageData((oldData: InfiniteData<GetMessagesResponse | null | undefined>): InfiniteData<GetMessagesResponse | null | undefined> => {
      let isMessageFound = false;

      const updatedPages = oldData.pages.map((page: GetMessagesResponse | null | undefined): GetMessagesResponse | null | undefined => {
        if (!page) return page;

        const updatedMessageGroups = page.messageGroups.map((messageGroup: TimelineMessageClusterDto): TimelineMessageClusterDto | null => {
          const messageIndex = messageGroup.messages.findIndex((m) => m.id === messageId);

          if (messageIndex === -1) {
            return messageGroup;
          }

          isMessageFound = true;

          const updatedMessages = [
            ...messageGroup.messages.slice(0, messageIndex),
            ...messageGroup.messages.slice(messageIndex + 1)
          ]

          return updatedMessages.length === 0
            ? null
            : {...messageGroup, messages: updatedMessages};
        }).filter((group) => group !== null);

        if (!isMessageFound) {
          return page;
        }

        return {
          ...page,
          messageGroups: updatedMessageGroups,
        };
      });

      if (!isMessageFound) {
        return oldData;
      }

      return {
        ...oldData,
        pages: updatedPages,
      };
    });
  };

  const [sendingMessageOperations, setSendingMessageOperations] = useState<SendingMessageOperation[]>([]);

  // message mutations
  const sendMessageMutation = useMutation({
    mutationFn: async (payload: SendMessagePayload): Promise<ServiceResponse<TimelineMessageDto>> => {
      return await messageService.sendMessage(
        channelId!,
        payload.idempotencyKey,
        payload.input.messageBody,
        payload.input.attachments,
        payload.input.replyingMessage?.id
      );
    },
    onMutate: async (payload: SendMessagePayload) => {
      setSendingMessageOperations((prev) => {
        // Check if this is a retry
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
    onSuccess: async (data: ServiceResponse<TimelineMessageDto>, payload: SendMessagePayload) => {
      if (data.success) {
        appendMessage(data.data!, authorization.userProfile ?? undefined);
        setSendingMessageOperations((prev) => prev.filter(m => m.operationId !== payload.operationId));
      } else {
        setSendingMessageOperations((prev) => prev.map(op =>
          op.operationId === payload.operationId ? {
            ...op,
            error: true,
          } : op
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

  const editMessageMutation = useMutation({
    mutationFn: async (payload: EditMessagePayload): Promise<ServiceResponse<TimelineMessageDto>> => {
      return await messageService.editMessage(payload.messageId, payload.newBody);
    },
    onMutate: async (payload: EditMessagePayload) => {
      // const processingMessage: MessageOperation | undefined = processingOperations.find(m => m.operationId == payload.operationId);
      //
      // if (processingMessage === undefined) {
      //   const newProcessingMessage: MessageOperation = {
      //     operationId: payload.operationId,
      //     operation: {
      //       type: "edit",
      //       messageId: payload.messageId,
      //       newBody: payload.newBody,
      //     },
      //   };
      //
      //   setProcessingOperations((prev) => [...prev, newProcessingMessage]);
      // } else if (processingMessage.operation.type === "error") {
      //   // retry
      //   const retryOperation: RetryOperation = processingMessage.operation.retryOperation;
      //
      //   setProcessingOperations((prev: MessageOperation[]): MessageOperation[] => prev.map((op =>
      //       op.operationId === payload.operationId ? {
      //         operationId: payload.operationId,
      //         operation: retryOperation as EditMessageOperation,
      //       } : op
      //   )));
      // }
    },
    onSuccess: async (data: ServiceResponse<TimelineMessageDto>, payload: EditMessagePayload) => {
      if (!data.success) {
        // let reason: string;
        //
        // if (data.statusCode === HttpStatusCode.InternalServerError) {
        //   reason = " due to internal server error.";
        // } else {
        //   reason = `. Reason: ${data.error?.message ?? "Unknown error"}`;
        // }
        //
        // setProcessingOperations((prev: MessageOperation[]): MessageOperation[] => prev.map(op =>
        //   op.operationId === payload.operationId ? {
        //     operationId: payload.operationId,
        //     operation: {
        //       type: "error",
        //       errorMessage: `Cannot edit message${reason}`,
        //       retryOperation: op.operation as RetryOperation,
        //     },
        //   } : op
        // ));
        return;
      }

      editMessage(payload.messageId, payload.newBody);
      // setProcessingOperations((prev) => prev.filter(m => m.operationId !== payload.operationId));
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (payload: DeleteMessagePayload): Promise<ServiceResponse> => {
      return await messageService.deleteMessage(payload.messageId);
    },
    onMutate: async (payload: DeleteMessagePayload) => {
      // const processingMessage: MessageOperation | undefined = processingOperations.find(m => m.operationId == payload.operationId);
      //
      // if (processingMessage === undefined) {
      //   const newProcessingMessage: MessageOperation = {
      //     operationId: payload.operationId,
      //     operation: {
      //       type: "delete",
      //       messageId: payload.messageId,
      //     },
      //   };
      //
      //   setProcessingOperations((prev) => [...prev, newProcessingMessage]);
      // } else if (processingMessage.operation.type === "error") {
      //   // retry
      //   const retryOperation: RetryOperation = processingMessage.operation.retryOperation;
      //
      //   setProcessingOperations((prev: MessageOperation[]): MessageOperation[] => prev.map((op =>
      //       op.operationId === payload.operationId ? {
      //         operationId: payload.operationId,
      //         operation: retryOperation as DeleteMessageOperation,
      //       } : op
      //   )));
      // }
    },
    onSuccess: async (data: ServiceResponse, payload: DeleteMessagePayload) => {
      if (!data.success) {
        // let reason: string;
        //
        // if (data.statusCode === HttpStatusCode.InternalServerError) {
        //   reason = " due to internal server error.";
        // } else {
        //   reason = `. Reason: ${data.error?.message ?? "Unknown error"}`;
        // }
        //
        // setProcessingOperations((prev: MessageOperation[]): MessageOperation[] => prev.map(op =>
        //   op.operationId === payload.operationId ? {
        //     operationId: payload.operationId,
        //     operation: {
        //       type: "error",
        //       errorMessage: `Cannot delete message${reason}`,
        //       retryOperation: op.operation as RetryOperation,
        //     },
        //   } : op
        // ));
        return;
      }

      deleteMessage(payload.messageId);
      // setProcessingOperations((prev) => prev.filter(m => m.operationId !== payload.operationId));
    },
  });

  // messaging operation
  const handleSendMessage = async (state: MessageInput) => {
    if (!channelId) return;

    const operationId = `__queue_message-${crypto.randomUUID()}`;
    const idempotencyKey = crypto.randomUUID();
    sendMessageMutation.mutate({operationId, input: state, idempotencyKey});

    setReplyingMessage(null);
  };

  const handleEditMessage = async (originalMessage: TimelineMessageDto, newBody: string | null) => {
    if (!channelId) return;

    const operationId = `__queue_message-${crypto.randomUUID()}`;
    editMessageMutation.mutate({
      operationId,
      messageId: originalMessage.id,
      newBody
    });
  };

  const handleDeleteMessage = async (message: TimelineMessageDto) => {
    if (!channelId) return;

    const operationId = `__queue_message-${crypto.randomUUID()}`;
    deleteMessageMutation.mutate({
      operationId,
      messageId: message.id
    });
  };

  return (
    <ChatContainerContext.Provider value={{
      channelId,
      replyingMessage,
      setReplyingMessage,
      messageQueryResult,
      messageClusters,
      userProfiles,
      appendMessage,
      editMessage,
      deleteMessage,
      handleSendMessage,
      handleEditMessage,
      handleDeleteMessage,
      sendingMessageOperations,
      removeSendingOperation,
      retrySendingOperation,
    }}>
      {children}
    </ChatContainerContext.Provider>
  )
}

export function useChatContainerContext(): ChatContainerContextType | null {
  const context = useContext(ChatContainerContext);
  if (!context) throw new Error("useChatContainerContext must be used within an ChatContainerContextProvider.");

  return context;
}