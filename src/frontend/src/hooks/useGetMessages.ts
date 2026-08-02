import {type InfiniteData, useInfiniteQuery, type UseInfiniteQueryResult} from "@tanstack/react-query";
import type {GetMessagesResponse} from "../api/responses.ts";
import {messageService} from "../api/messageService.ts";
import type {MessageLoadDirection} from "../api/requests.ts";

export default function useGetMessages(channelId: string | null | undefined, loadCount: number): UseInfiniteQueryResult<InfiniteData<GetMessagesResponse | null | undefined, unknown>, Error> {
    type PageParams = {
        cursorId?: string;
        direction: MessageLoadDirection;
    }

    return useInfiniteQuery({
        enabled: !!channelId,
        queryKey: ["conversation", channelId],
        queryFn: async ({ pageParam }: { pageParam: PageParams }): Promise<GetMessagesResponse | null | undefined> => {
            await new Promise(resolve => setTimeout(resolve, 1000));

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
}