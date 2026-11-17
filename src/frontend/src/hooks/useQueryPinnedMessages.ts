import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import type { KeyedPaginatedPage, PinnedMessageDto } from "../api/types.ts";
import { conversationService } from "../api/conversationService.ts";

type PageParams = {
  before: string | null;
};

export default function useQueryPinnedMessages(
  conversationId: string,
  options: Omit<
    UseInfiniteQueryOptions<
      KeyedPaginatedPage<string, PinnedMessageDto>,
      Error,
      InfiniteData<KeyedPaginatedPage<string, PinnedMessageDto>>,
      QueryKey,
      PageParams
    >,
    "queryKey" | "queryFn" | "initialPageParam" | "getNextPageParam"
  >,
) {
  return useInfiniteQuery<
    KeyedPaginatedPage<string, PinnedMessageDto>,
    Error,
    InfiniteData<KeyedPaginatedPage<string, PinnedMessageDto>>,
    QueryKey,
    PageParams
  >({
    queryKey: useQueryPinnedMessages.getKey(conversationId),
    queryFn: async ({
      pageParam,
    }: {
      pageParam: PageParams;
    }): Promise<KeyedPaginatedPage<string, PinnedMessageDto>> => {
      return await conversationService.queryPinnedMessages(
        conversationId,
        pageParam.before ?? undefined,
        undefined,
      );
    },
    initialPageParam: {} as PageParams,
    getNextPageParam: (
      lastPage: KeyedPaginatedPage<string, PinnedMessageDto>,
    ) => {
      if (!lastPage?.hasNextPage || lastPage.elements.length === 0)
        return undefined;

      return { before: lastPage.elements[0].pinnedAt };
    },
    ...options,
  });
}

useQueryPinnedMessages.getKey = (conversationId: string) => [
  "useQueryPinnedMessages",
  conversationId,
];
