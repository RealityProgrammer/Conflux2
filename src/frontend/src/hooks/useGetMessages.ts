import {type InfiniteData, useInfiniteQuery, type UseInfiniteQueryResult, useQueryClient} from "@tanstack/react-query";
import type {
  GetMessagesResponse,
  TimelineMessageDto,
  TimelineMessageClusterDto,
  UserIdentityProfileDto
} from "../api/types.ts";
import {messageService} from "../api/messageService.ts";
import {MessageLoadDirection} from "../api/schema.ts";

export interface UseGetMessagesResult {
  useInfiniteQueryResult: UseInfiniteQueryResult<InfiniteData<GetMessagesResponse | null | undefined, unknown>, Error>;
  allMessageGroups: TimelineMessageClusterDto[];
  userProfiles: Record<string, UserIdentityProfileDto>;
  queryKey: (string | null | undefined)[];
  appendMessage: (newMessage: TimelineMessageDto, userProfile?: UserIdentityProfileDto) => void;
  editMessage: (messageId: string, newBody: string | null) => void;
  deleteMessage: (messageId: string) => void;
}

export default function useGetMessages(channelId: string | null | undefined, loadCount: number): UseGetMessagesResult {
  type PageParams = {
    cursorId?: string;
    direction: MessageLoadDirection;
  }

  const queryKey = ["channelConversation", channelId];

  const queryResult = useInfiniteQuery({
    enabled: !!channelId,
    queryKey,
    queryFn: async ({pageParam}: { pageParam: PageParams }): Promise<GetMessagesResponse | null | undefined> => {
      const response = await messageService.getMessages(
        channelId!,
        pageParam.direction,
        pageParam.cursorId,
        loadCount,
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

  const allMessageGroups: TimelineMessageClusterDto[] = queryResult.data?.pages.flatMap((page) => page?.messageGroups ?? []) ?? [];

  // allMessageGroups is basically a flatten groups, if page N end and page N+1 have same sender id, it still considered
  // as separate group
  const mergedGroups: TimelineMessageClusterDto[] = allMessageGroups.reduce<TimelineMessageClusterDto[]>((acc, currentGroup) => {
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

  if (queryResult.data?.pages) {
    for (const page of queryResult.data?.pages) {
      if (page?.users) {
        for (const user of page.users) {
          userProfiles[user.id] = user;
        }
      }
    }
  }

  // modification callbacks
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
  }

  return {
    useInfiniteQueryResult: queryResult,
    allMessageGroups: mergedGroups,
    userProfiles,
    queryKey,
    appendMessage,
    editMessage,
    deleteMessage,
  };
}
