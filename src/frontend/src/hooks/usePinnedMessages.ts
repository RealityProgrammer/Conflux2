import {
  type InfiniteData,
  type UseInfiniteQueryOptions,
  type UseInfiniteQueryResult,
  useQueryClient
} from "@tanstack/react-query";
import {
  type GetConversationPinnedMessagesQuery, type GetConversationPinnedMessagesQueryVariables,
  useInfiniteGetConversationPinnedMessagesQuery
} from "../graphql/infiniteQueries.ts";
import type {PinnedMessageDto} from "../graphql/types.ts";

interface UsePinnedMessagesResult {
  queryResult: UseInfiniteQueryResult<InfiniteData<GetConversationPinnedMessagesQuery, unknown>, Error>;
  append: (message: PinnedMessageDto) => void;
  remove: (messageId: string) => void;
}

export default function usePinnedMessages(
  conversationId: string,
  options?: Omit<Omit<UseInfiniteQueryOptions<GetConversationPinnedMessagesQuery, Error, InfiniteData<GetConversationPinnedMessagesQuery>>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<GetConversationPinnedMessagesQuery, Error, InfiniteData<GetConversationPinnedMessagesQuery>>['queryKey'] }, "queryFn" | "initialPageParam" | "getNextPageParam">
): UsePinnedMessagesResult {
  const queryResult: UseInfiniteQueryResult<InfiniteData<GetConversationPinnedMessagesQuery, unknown>, Error> = useInfiniteGetConversationPinnedMessagesQuery(
    {
      conversationId,
      after: null,
    } as GetConversationPinnedMessagesQueryVariables,
    {
      initialPageParam: {conversationId, after: null},
      getNextPageParam: (lastPage: GetConversationPinnedMessagesQuery): { after: string } | undefined => {
        const pageInfo: GetConversationPinnedMessagesQuery["pinnedMessages"]["pageInfo"] = lastPage?.pinnedMessages.pageInfo;

        if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
          return { after: pageInfo.endCursor };
        }

        return undefined;
      },
      ...options
    },
  );

  const queryClient = useQueryClient();

  const append = (message: PinnedMessageDto) => {
    queryClient.setQueryData<InfiniteData<GetConversationPinnedMessagesQuery, unknown>>(
      useInfiniteGetConversationPinnedMessagesQuery.getKey({ conversationId, after: null }),
      (oldData) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          pages: oldData.pages.map((page, index: number) =>
            index === 0 ? {
              ...page,
              pinnedMessages: {
                ...page.pinnedMessages,
                nodes: page.pinnedMessages.nodes ? [
                  {
                    id: message.id,
                    body: message.body ?? null,
                    attachments: message.attachments,
                    createdAt: message.createdAt,
                    sender: {
                      id: message.sender!.id,
                      displayName: message.sender!.displayName,
                      avatar: message.sender!.avatar ?? null,
                    },
                  },
                  ...page.pinnedMessages.nodes,
                ] : null,
              },
            } : page
          ),
        };
      }
    );
  };

  const remove = (messageId: string) => {
    queryClient.setQueryData<InfiniteData<GetConversationPinnedMessagesQuery, unknown>>(
      useInfiniteGetConversationPinnedMessagesQuery.getKey({ conversationId, after: null }),
      (oldData) => {
        if (!oldData) return oldData;

        if (!oldData.pages.some(p => p.pinnedMessages.nodes && p.pinnedMessages.nodes.some(n => n.id === messageId))) {
          return oldData;
        }

        return {
          ...oldData,
          pages: oldData.pages.map(page => ({
            ...page,
            pinnedMessages: {
              ...page.pinnedMessages,
              nodes: page.pinnedMessages.nodes ? page.pinnedMessages.nodes.filter(m => m.id !== messageId) : page.pinnedMessages.nodes,
            }
          })),
        };
      }
    );
  }

  return { queryResult, append, remove };
}