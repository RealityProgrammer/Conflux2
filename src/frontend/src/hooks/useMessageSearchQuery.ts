import {
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
} from "@tanstack/react-query";
import type { SearchRequest } from "../store/useHistoryConversationSearchStore.ts";
import { conversationService } from "../api/conversationService.ts";
import type { MessageSearchPage } from "../api/types.ts";

interface UseMessageSearchQueryVariables {
  conversationId: string;
  request: SearchRequest;
}

type PageParam = { beforeCursor: string | null };

export default function useMessageSearchQuery(
  variables: UseMessageSearchQueryVariables,
  options: Omit<
    UseInfiniteQueryOptions<MessageSearchPage, Error, InfiniteData<MessageSearchPage>, QueryKey, PageParam>,
    "queryKey" | "getNextPageParam" | "initialPageParam" | "queryFn"
  >,
) {
  return useInfiniteQuery<MessageSearchPage, Error, InfiniteData<MessageSearchPage>, QueryKey, PageParam>({
    queryKey: useMessageSearchQuery.getKey(variables),
    initialPageParam: { beforeCursor: null },
    getNextPageParam: (lastPage: MessageSearchPage) => {
      if (!lastPage || !lastPage.hasNextPage) {
        return undefined;
      }

      return { beforeCursor: lastPage.nextPageCursor };
    },
    queryFn: async (metadata) => {
      return await conversationService.searchMessage(
        variables.conversationId,
        variables.request,
        metadata.pageParam.beforeCursor,
      );
    },
    ...options,
  });
}

useMessageSearchQuery.getKey = (variables: UseMessageSearchQueryVariables) => [
  "useMessageSearchQuery",
  variables,
];
