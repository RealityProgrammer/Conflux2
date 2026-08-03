import {useLoaderData} from "react-router";
import {useDocumentTitle, useResizeObserver} from "usehooks-ts";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import ChatInput, {type ChatInputMessageState} from "../../components/ChatInput.tsx";
import {messageService} from "../../api/messageService.ts";
import type {MessageDto, UserBasicProfileSummary} from "../../api/responses.ts";
import Spinner from "../../components/Spinner.tsx";
import {useLayoutEffect, useRef, useState} from "react";
import type {ReactVirtualizer, VirtualItem} from "@tanstack/react-virtual";
import useGetMessages from "../../hooks/useGetMessages.ts";
import {layout, type LayoutResult, prepare, type PreparedText} from "@chenglou/pretext";

// https://tanstack.com/virtual/latest/docs/framework/react/examples/pretext?panel=code

const LOAD_COUNT = 20;
const BODY_FONT = '14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const BODY_LINE_HEIGHT = 24;

const preparedCache = new Map<string, PreparedText>();

function fallbackTextHeight(text: string, width: number) {
    const averageCharacterWidth = 7;
    const charactersPerLine = Math.max(
        1,
        Math.floor(width / averageCharacterWidth),
    );

    return text.split('\n').reduce((height, paragraph) => {
        const lineCount = Math.max(
            1,
            Math.ceil(paragraph.length / charactersPerLine),
        );
        return height + lineCount * BODY_LINE_HEIGHT;
    }, 0);
}

function getPreparedMessage(message: MessageDto): PreparedText | null {
    if (!message.body) {
        return null;
    }

    const key = message.id;
    const cached = preparedCache.get(key);

    if (cached) {
        return cached;
    }

    const prepared = prepare(message.body, BODY_FONT, {
        whiteSpace: 'pre-wrap',
        wordBreak: 'normal',
    });

    preparedCache.set(key, prepared);
    return prepared;
}

function estimateMessageHeight(message: MessageDto, viewportWidth: number): number {
    if (!message.body) return 0;

    const textWidth = Math.max(1, viewportWidth);

    const isSupported: boolean = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

    if (!isSupported) {
        return fallbackTextHeight(message.body, textWidth);
    }

    const layoutResult: LayoutResult = layout(getPreparedMessage(message)!, textWidth, BODY_LINE_HEIGHT);

    return layoutResult.height;
}

export default function DirectMessagePage() {
    useDocumentTitle("DM - Conflux");

    const { channelId, channelSummary }: DirectMessagePageLoaderProps = useLoaderData();

    const viewportRef = useRef<HTMLDivElement>(null!);
    const virtualizerRef = useRef<ReactVirtualizer<HTMLDivElement, Element>>(null!);

    const [isReady, setIsReady] = useState(false);

    const { width: viewportWidth = 0 } = useResizeObserver({
        ref: viewportRef,
    });

    const {
        useInfiniteQueryResult: {
            hasPreviousPage,
            isFetchingPreviousPage,
            fetchPreviousPage,
            hasNextPage,
            isFetchingNextPage,
            fetchNextPage,
            isLoading,
        },
        allMessages,
        userMap
    } = useGetMessages(channelId, LOAD_COUNT);

    // jump to the bottom when the messages are rendered
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
                viewportRef={viewportRef}
                className="flex-1 min-h-0"
                items={allMessages}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                estimateSize={(index) => {
                    const prevOffset = hasPreviousPage ? 1 : 0;

                    // if it is loaders, hardcode the size.
                    if ((hasPreviousPage && index == 0) || (hasNextPage && index == prevOffset + allMessages.length)) {
                        return 30;
                    }

                    const message: MessageDto | undefined = allMessages[index - prevOffset];

                    if (!message) {
                        return 52;  // should it be happen? shouldn't be, right?
                    }

                    return estimateMessageHeight(message, viewportWidth);
                }}
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
                renderItem={(item, virtualItem) => (
                    <MessageRow message={item} virtualItem={virtualItem} allMessages={allMessages} userMap={userMap}/>
                )}/>

            <ChatInput disabled={!channelId || !channelSummary}
                       onSendMessage={handleSendMessage}/>
        </div>
    );
}

interface MessageRowProps {
    message: MessageDto;
    allMessages: MessageDto[];
    virtualItem: VirtualItem;
    userMap: Map<string, UserBasicProfileSummary>;
}

function MessageRow({ message, virtualItem, allMessages, userMap }: MessageRowProps) {
    return (
        <p style={{height: `${virtualItem.size}px`}} className="text-sm leading-6 hover-highlight w-full whitespace-pre-wrap">{item?.body ?? "null"}</p>
    );
}