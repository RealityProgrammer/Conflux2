import {type InfiniteData, useInfiniteQuery, type UseInfiniteQueryResult} from "@tanstack/react-query";
import type {GetMessagesResponse, MessageDto, UserBasicProfileSummary} from "../api/responses.ts";
import {messageService} from "../api/messageService.ts";
import type {MessageLoadDirection} from "../api/requests.ts";
import {useMemo} from "react";

interface UseGetMessagesResult {
    useInfiniteQueryResult: UseInfiniteQueryResult<InfiniteData<GetMessagesResponse | null | undefined, unknown>, Error>;
    allMessages: MessageDto[];
    userMap: Map<string, UserBasicProfileSummary>;
}

export default function useGetMessages(channelId: string | null | undefined, loadCount: number): UseGetMessagesResult {
    type PageParams = {
        cursorId?: string;
        direction: MessageLoadDirection;
    }

    const queryResult = useInfiniteQuery({
        enabled: !!channelId,
        queryKey: ["channelConversation", channelId],
        queryFn: async ({ pageParam }: { pageParam: PageParams }): Promise<GetMessagesResponse | null | undefined> => {
            const response = await messageService.getMessages({
                channelId: channelId!,
                direction: pageParam.direction,
                cursor: pageParam.cursorId,
                count: loadCount,
            });

            return response.data;
        },
        initialPageParam: {
            cursorId: undefined,
            direction: "Before",
        },

        getPreviousPageParam: (firstPage: GetMessagesResponse | null | undefined): PageParams | undefined => {
            if (firstPage?.hasMoreBefore && firstPage.messages.length > 0) {
                const oldestMessage = firstPage.messages[0];

                return {
                    cursorId: oldestMessage.id,
                    direction: 'Before'
                };
            }

            return undefined;
        },

        getNextPageParam: (lastPage: GetMessagesResponse | null | undefined): PageParams | undefined => {
            if (lastPage?.hasMoreAfter && lastPage.messages.length > 0) {
                const newestMessage = lastPage.messages[lastPage.messages.length - 1];

                return {
                    cursorId: newestMessage.id,
                    direction: 'After'
                };
            }

            return undefined;
        },

        staleTime: 60 * 30,
        refetchOnWindowFocus: false,
    });

    const allMessages: MessageDto[] = queryResult.data?.pages.flatMap((page) => page?.messages ?? []) ?? [];

    const userMap = new Map<string, UserBasicProfileSummary>();

    if (queryResult.data?.pages) {
        for (const page of queryResult.data?.pages) {
            if (page?.users) {
                for (const [userId, user] of Object.entries(page.users)) {
                    userMap.set(userId, user);
                }
            }
        }
    }

    return { useInfiniteQueryResult: queryResult, allMessages, userMap };
}