import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  type UseInfiniteQueryResult,
  useQueryClient
} from "@tanstack/react-query";
import type {TimelineMessageDto, TimelineMessagePage} from "../api/types.ts";
import {conversationService} from "../api/conversationService.ts";
import {MessageLoadDirection} from "../api/schema.ts";

const LOAD_COUNT = 50;

type PageParams = {
  cursorId?: string;
  direction: MessageLoadDirection;
};

interface UseTimelineMessagesResult {
  queryResult: UseInfiniteQueryResult<InfiniteData<TimelineMessagePage | null | undefined, unknown>, Error>;
  appendMessage: (message: TimelineMessageDto) => void;
  updateMessage: (messageId: string, properties: Partial<Omit<TimelineMessageDto, "id" | "type" | "conversationId">>) => void;
  deleteMessage: (messageId: string) => void;
}

export default function useTimelineMessages(conversationId: string): UseTimelineMessagesResult {
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

  return {
    queryResult: messageQueryResult,
    appendMessage,
    updateMessage,
    deleteMessage,
  }
}