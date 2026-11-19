import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  type UseInfiniteQueryResult,
} from "@tanstack/react-query";
import type { TimelineMessagePage } from "../api/types.ts";
import { conversationService } from "../api/conversationService.ts";

type PageParams = {
  loadDirection: "Around" | "Before" | "After" | "Latest";
  cursorMessageId?: string;
};

export default function useQueryTimelineMessages(
  conversationId: string,
  anchorId: string | null = null,
): UseInfiniteQueryResult<InfiniteData<TimelineMessagePage | null | undefined, unknown>, Error> {
  return useInfiniteQuery<
    TimelineMessagePage,
    Error,
    InfiniteData<TimelineMessagePage>,
    QueryKey,
    PageParams
  >({
    enabled: !!conversationId,
    queryKey: useQueryTimelineMessages.getKey(conversationId, anchorId),
    queryFn: async ({ pageParam }: { pageParam: PageParams }): Promise<TimelineMessagePage> => {
      return await conversationService.queryTimelineMessages(
        conversationId,
        pageParam.loadDirection,
        pageParam.cursorMessageId,
      );
    },
    initialPageParam: anchorId
      ? { loadDirection: "Around", cursorMessageId: anchorId }
      : { loadDirection: "Latest" },

    getPreviousPageParam: (firstPage: TimelineMessagePage): PageParams | undefined => {
      if (!firstPage?.hasMoreBefore || firstPage.messages.length === 0) return undefined;

      return {
        loadDirection: "Before",
        cursorMessageId: firstPage.messages[0].id,
      };
    },

    getNextPageParam: (lastPage: TimelineMessagePage): PageParams | undefined => {
      if (!lastPage?.hasMoreAfter || lastPage.messages.length === 0) return undefined;

      return {
        loadDirection: "After",
        cursorMessageId: lastPage.messages[lastPage.messages.length - 1].id,
      };
    },

    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

useQueryTimelineMessages.getKey = (conversationId: string, anchorId: string | null = null) => [
  "useQueryTimelineMessages",
  conversationId,
  anchorId ?? "latest",
];
