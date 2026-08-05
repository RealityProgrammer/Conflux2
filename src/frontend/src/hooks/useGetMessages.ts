import {type InfiniteData, useInfiniteQuery, type UseInfiniteQueryResult} from "@tanstack/react-query";
import type {GetMessagesResponse, MessageGroup, UserBasicProfileSummary} from "../api/responses.ts";
import {messageService} from "../api/messageService.ts";
import type {MessageLoadDirection} from "../api/requests.ts";

interface UseGetMessagesResult {
    useInfiniteQueryResult: UseInfiniteQueryResult<InfiniteData<GetMessagesResponse | null | undefined, unknown>, Error>;
    allMessageGroups: MessageGroup[];
    userMap: Record<string, UserBasicProfileSummary>;
    queryKey: (string | null | undefined)[];
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
            if (firstPage?.hasMoreBefore && firstPage.messageGroups.length > 0) {
                const oldestMessage = firstPage.messageGroups[0];

                return {
                    cursorId: oldestMessage.messages[0].id,
                    direction: 'Before'
                };
            }

            return undefined;
        },

        getNextPageParam: (lastPage: GetMessagesResponse | null | undefined): PageParams | undefined => {
            if (lastPage?.hasMoreAfter && lastPage.messageGroups.length > 0) {
                return {
                    cursorId: lastPage.messageGroups.at(-1)?.messages.at(-1)?.id,
                    direction: 'After'
                };
            }

            return undefined;
        },

        staleTime: 60 * 30,
        refetchOnWindowFocus: false,
    });

    const allMessageGroups: MessageGroup[] = queryResult.data?.pages.flatMap((page) => page?.messageGroups ?? []) ?? [];

    // allMessageGroups is basically a flatten groups, if page N end and page N+1 have same sender id, it still considered
    // as separate group
    const mergedGroups: MessageGroup[] = allMessageGroups.reduce<MessageGroup[]>((acc, currentGroup) => {
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

    const userMap: Record<string, UserBasicProfileSummary> = {};

    if (queryResult.data?.pages) {
        for (const page of queryResult.data?.pages) {
            if (page?.users) {
                for (const user of page.users) {
                    userMap[user.id] = user;
                }
            }
        }
    }

    return { useInfiniteQueryResult: queryResult, allMessageGroups: mergedGroups, userMap, queryKey };
}