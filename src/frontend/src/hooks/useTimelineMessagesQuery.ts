import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import type {MessageReadStrategy, TimelineMessagePage} from "../api/types.ts";
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

export default function useTimelineMessagesQuery(
  conversationId: string,
  anchorId: string | null = null
): UseInfiniteQueryResult<InfiniteData<TimelineMessagePage | null | undefined, unknown>, Error> {
  const queryKey: QueryKey = ["conversation", conversationId, anchorId ?? "latest"];

  return useInfiniteQuery({
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
}