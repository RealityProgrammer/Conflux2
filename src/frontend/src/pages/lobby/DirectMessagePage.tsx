import {useLoaderData} from "react-router";
import {useDocumentTitle} from "usehooks-ts";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import ChatInput, {type ChatInputMessageState} from "../../components/ChatInput.tsx";
import {messageService} from "../../api/messageService.ts";
import type {MessageDto} from "../../api/responses.ts";
import Spinner from "../../components/Spinner.tsx";
import {useLayoutEffect, useRef, useState} from "react";
import type {ReactVirtualizer} from "@tanstack/react-virtual";
import useGetMessages from "../../hooks/useGetMessages.ts";

const LOAD_COUNT = 20;

export default function DirectMessagePage() {
    useDocumentTitle("DM - Conflux");

    const { channelId, channelSummary }: DirectMessagePageLoaderProps = useLoaderData();
    const virtualizerRef = useRef<ReactVirtualizer<HTMLDivElement, Element>>(null!);

    const [isReady, setIsReady] = useState(false);

    const {
        data,
        hasPreviousPage,
        isFetchingPreviousPage,
        fetchPreviousPage,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        isLoading,
    } = useGetMessages(channelId, LOAD_COUNT);

    const allMessages: MessageDto[] = data?.pages.flatMap((page) => page?.messages ?? []) ?? [];

    useLayoutEffect(() => {
        if (allMessages.length > 0 && !isReady) {
            requestAnimationFrame(() => {
                const virtualizer = virtualizerRef.current;
                if (!virtualizer) return;

                const totalVirtualItems = virtualizer.options.count;

                virtualizer.scrollToIndex(totalVirtualItems - 1, { align: 'end' });

                requestAnimationFrame(() => {
                    setIsReady(true);
                });
            });
        } else if (!isLoading && allMessages.length === 0) {
            setIsReady(true);
        }
    }, [allMessages.length, isLoading, isReady]);

    const handleSendMessage = async (messagePayload: ChatInputMessageState) => {
        if (!channelId) return;

        await messageService.sendMessage(channelId, messagePayload.messageBody, messagePayload.attachments);
    };

    return (
        <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
            <header className="flex-none basis-11 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2 gap-2">
                {!!channelId && !!channelSummary ? (
                    <>
                        <UserAvatar hasAvatar={channelSummary.otherUser.hasAvatar}
                                    className="size-8 overflow-hidden rounded-full"/>

                        <p>{channelSummary.otherUser.userName}</p>
                    </>
                ) : (
                    <p>But nobody came...</p>
                )}
            </header>

            <VirtualizedScrollList
                virtualizerRef={virtualizerRef}
                className="flex-1 min-h-0"
                items={allMessages}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                estimateSize={52}
                hasPreviousPage={hasPreviousPage}
                isFetchingPreviousPage={isFetchingPreviousPage}
                fetchPreviousPage={() => {
                    if (isReady) {
                        fetchPreviousPage()
                    }
                }}
                renderFetchingPrevious={() => (
                    <div className="size-6 flex flex-row justify-center items-center w-full">
                        <Spinner className="size-6 fill-white"/>
                    </div>
                )}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={() => { fetchNextPage() }}
                renderFetchingNext={() => (
                    <div className="size-6 flex flex-row justify-center items-center w-full">
                        <Spinner className="size-6 fill-white"/>
                    </div>
                )}
                renderEmpty={() => (
                    <div className="flex flex-1 select-none justify-center items-end text-gray-300 pb-3">
                        And our story begin...
                    </div>
                )}
                renderItem={(item) => {
                    return (
                        <p style={{height: '52px'}}>{item?.body ?? "null"}</p>
                    );
                }}/>

            <ChatInput disabled={!channelId || !channelSummary}
                       onSendMessage={handleSendMessage}/>
        </div>
    );
}