import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  useQueryClient
} from "@tanstack/react-query";
import type {MessageReadStrategy, TimelineMessageDto, TimelineMessagePage} from "../api/types.ts";
import {conversationService} from "../api/conversationService.ts";
import {
  MessageReadStrategyAfterType,
  MessageReadStrategyAroundType,
  MessageReadStrategyBeforeType,
  MessageReadStrategyLatestType
} from "../api/schema.ts";

type PageParams = {
  readStrategy: MessageReadStrategy;
};

interface UseTimelineMessagesResult {
  queryResult: UseInfiniteQueryResult<InfiniteData<TimelineMessagePage | null | undefined, unknown>, Error>;
  appendMessage: (message: TimelineMessageDto) => void;
  updateMessage: (messageId: string, properties: Partial<Omit<TimelineMessageDto, "id" | "type" | "conversationId">>) => void;
  deleteMessage: (messageId: string) => void;
}

export default function useTimelineMessages(
  conversationId: string,
  anchorId: string | null = null
): UseTimelineMessagesResult {
  const queryKey: QueryKey = ["conversation", conversationId, anchorId ?? "latest"];

  const messageQueryResult = useInfiniteQuery({
    enabled: !!conversationId,
    queryKey,
    queryFn: async ({pageParam}: { pageParam: PageParams }): Promise<TimelineMessagePage | null | undefined> => {
      const response = await conversationService.readTimelineMessages(
        conversationId!,
        pageParam.readStrategy
      );

      return response.data;
    },
    initialPageParam: {
      readStrategy: anchorId ? { type: MessageReadStrategyAroundType.around, anchorId } : { type: MessageReadStrategyLatestType.latest }
    } as PageParams,

    getPreviousPageParam: (firstPage: TimelineMessagePage | null | undefined): PageParams | undefined => {
      if (!firstPage?.hasMoreBefore || firstPage.messages.length === 0) return undefined;

      return {
        readStrategy: {
          type: MessageReadStrategyBeforeType.before,
          cursorId: firstPage.messages[0].id
        },
      };
    },

    getNextPageParam: (lastPage: TimelineMessagePage | null | undefined): PageParams | undefined => {
      if (!lastPage?.hasMoreAfter || lastPage.messages.length === 0) return undefined;

      return {
        readStrategy: {
          type: MessageReadStrategyAfterType.after,
          cursorId: lastPage.messages[lastPage.messages.length - 1].id
        },
      };
    },

    staleTime: 60 * 30 * 1000,
    refetchOnWindowFocus: false,
  });

  const queryClient = useQueryClient();

  const modifyMessageData = (callback: (oldData: InfiniteData<TimelineMessagePage | null | undefined>) => InfiniteData<TimelineMessagePage | null | undefined>) => {
    queryClient.setQueriesData<InfiniteData<TimelineMessagePage | undefined | null>>(
      { queryKey: ["conversation", conversationId] },
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

  return {
    queryResult: messageQueryResult,
    appendMessage,
    updateMessage,
    deleteMessage,
  }
}