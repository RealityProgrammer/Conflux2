import {useLoaderData} from "react-router";
import {useDocumentTitle, useResizeObserver} from "usehooks-ts";
import VirtualizedScrollList from "../../components/VirtualizedScrollList.tsx";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import UserAvatar from "../../components/UserAvatar.tsx";
import ChatInput, {type ChatInputMessageState} from "../../components/ChatInput.tsx";
import {messageService} from "../../api/messageService.ts";
import type {MessageDto, ServiceResponse, UserBasicProfileSummary} from "../../api/responses.ts";
import Spinner from "../../components/Spinner.tsx";
import {type HTMLAttributes, useEffect, useLayoutEffect, useRef, useState} from "react";
import type {ReactVirtualizer, VirtualItem} from "@tanstack/react-virtual";
import useGetMessages from "../../hooks/useGetMessages.ts";
import {layout, type LayoutResult, prepare, type PreparedText} from "@chenglou/pretext";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useAuthorization} from "../../contexts/AuthContext.tsx";

// https://tanstack.com/virtual/latest/docs/framework/react/examples/pretext?panel=code

const LOAD_COUNT = 50;
const BODY_FONT = '14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const BODY_LINE_HEIGHT = 24;

const preparedCache = new Map<string, PreparedText>();

type MessageDisplayInfo = {
    userInfo?: UserBasicProfileSummary;
}

type QueuedMessage = MessageDto & { __status: 'sending' | 'error' };

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

function estimateMessageHeight(message: MessageDto, viewportWidth: number, showProfile: boolean): number {
    viewportWidth = viewportWidth - 16 - 52;

    if (!message.body) return 0;

    const textWidth = Math.max(1, viewportWidth);

    const isSupported: boolean = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

    if (!isSupported) {
        return fallbackTextHeight(message.body, textWidth);
    }

    const layoutResult: LayoutResult = layout(getPreparedMessage(message)!, textWidth, BODY_LINE_HEIGHT);

    return layoutResult.height + (showProfile ? 24 : 0);
}

export default function DirectMessagePage() {
    useDocumentTitle("DM - Conflux");

    const authorization = useAuthorization();

    const { channelId, channelSummary }: DirectMessagePageLoaderProps = useLoaderData();

    const queryClient = useQueryClient();
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
        userMap,
        queryKey
    } = useGetMessages(channelId, LOAD_COUNT);

    const [pendingQueue, setPendingQueue] = useState<QueuedMessage[]>([]);

    console.log("pending queue:", JSON.stringify(pendingQueue));

    const displayMessages = [...allMessages, ...pendingQueue];

    // bake the rendering info
    const messageDisplayInfo: MessageDisplayInfo[] = new Array(displayMessages.length);

    if (displayMessages.length > 0) {
        messageDisplayInfo[0] = {
            userInfo: userMap.get(displayMessages[0].senderUserId),
        }

        for (let i = 1; i < displayMessages.length; i += 1) {
            const previousMessage = displayMessages[i - 1];
            const currentMessage = displayMessages[i];

            messageDisplayInfo[i] = {
                userInfo: previousMessage.senderUserId === currentMessage.senderUserId ?
                    undefined :
                    userMap.get(currentMessage.senderUserId),
            };
        }
    }

    // jump to the bottom when the messages are rendered
    useLayoutEffect(() => {
        if (displayMessages.length > 0 && !isReady) {
            requestAnimationFrame(() => {
                const virtualizer = virtualizerRef.current;
                if (!virtualizer) return;

                const totalVirtualItems = virtualizer.options.count;

                virtualizer.scrollToIndex(totalVirtualItems - 1, { align: 'end' });

                requestAnimationFrame(() => {
                    setIsReady(true);
                });
            });
        } else if (!isLoading && displayMessages.length === 0) {
            setIsReady(true);
        }
    }, [displayMessages.length, isLoading, isReady]);

    const sendMessageMutation = useMutation({
        mutationFn: async (payload: { tempId: string, data: ChatInputMessageState }) => {
            await new Promise(resolve => setTimeout(resolve, 2000));

            return await messageService.sendMessage(channelId!, payload.data.messageBody, payload.data.attachments);
        },
        onMutate: async (payload: { tempId: string, data: ChatInputMessageState }) => {
            const queuedMessage: QueuedMessage = {
                id: payload.tempId,
                body: payload.data.messageBody,
                senderUserId: authorization.userProfile?.id ?? `arbitrary-${new Date()}`,
                createdAt: new Date(),
                attachmentIds: [],
                __status: 'sending',
            };

            setPendingQueue((prev) => [...prev, queuedMessage]);
        },
        onSuccess: async (data: ServiceResponse, payload: { tempId: string, data: ChatInputMessageState }) => {
            if (!data.success) {
                setPendingQueue((prev) => prev.map(m =>
                    m.id === payload.tempId ? { ...m, __status: 'error' } : m
                ));

                return;
            }

            // invalidate the query, await to allow it to finish
            await queryClient.invalidateQueries({ queryKey });

            // remove the query
            setPendingQueue((prev) => prev.filter(m => m.id !== payload.tempId));
        },
        onError: (err, payload: { tempId: string, data: ChatInputMessageState }) => {
            setPendingQueue((prev) => prev.map(m =>
                m.id === payload.tempId ? { ...m, __status: 'error' } : m
            ));
        },
    })

    const handleSendMessage = async (messagePayload: ChatInputMessageState) => {
        if (!channelId) return;

        const tempId = `__queue_message-${Date.now()}`;
        sendMessageMutation.mutate({ tempId, data: messagePayload });
    };

    const previousMessageCount = useRef(displayMessages.length);

    useEffect(() => {
        // array grew means a new message arrived, or user send something that causes queue array to changed
        if (displayMessages.length > previousMessageCount.current && isReady) {
            requestAnimationFrame(() => {
                const virtualizer = virtualizerRef.current;
                if (!virtualizer) return;

                // Jump to the newest message
                virtualizer.scrollToIndex(virtualizer.options.count - 1, { align: 'end' });
            });
        }

        previousMessageCount.current = displayMessages.length;
    }, [displayMessages.length, isReady]);

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
                containerClassName="mt-auto"
                items={displayMessages}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                estimateSize={(index) => {
                    const prevOffset = hasPreviousPage ? 1 : 0;

                    // if it is loaders, hardcode the size.
                    if ((hasPreviousPage && index == 0) || (hasNextPage && index == prevOffset + displayMessages.length)) {
                        return 30;
                    }

                    const message: MessageDto | undefined = displayMessages[index - prevOffset];
                    const displayInfo = messageDisplayInfo[index - prevOffset];

                    if (!message) {
                        return 52;  // should it be happened? shouldn't be, right?
                    }

                    return estimateMessageHeight(
                        message,
                        viewportWidth,
                        !(message as QueuedMessage).__status && !!displayInfo.userInfo
                    );
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
                renderItem={(item, virtualItem, itemIndex) => (
                    <MessageRow message={item}
                                virtualItem={virtualItem}
                                userMap={userMap}
                                displayInfo={messageDisplayInfo[itemIndex] ?? { userInfo: undefined }}/>
                )}/>

            <ChatInput disabled={!channelId || !channelSummary}
                       onSendMessage={handleSendMessage}/>
        </div>
    );
}

interface MessageRowProps {
    message: MessageDto;
    virtualItem: VirtualItem;
    userMap: Map<string, UserBasicProfileSummary>;
    displayInfo: MessageDisplayInfo;
}

function MessageRow({ message, displayInfo }: MessageRowProps) {
    return (
        <div className="hover-highlight w-full">
            <div className="flex flex-row gap-3 mx-2">
                {displayInfo.userInfo ? (
                    <>
                        <UserAvatar
                            hasAvatar={displayInfo.userInfo?.hasAvatar ?? false}
                            userId={message.senderUserId}
                            className="flex-none mt-1 h-10 aspect-square self-stretch select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"/>

                        <div className="flex-1">
                            <p className="text-base text-white">{displayInfo.userInfo.userName}</p>

                            <MessageRowContent message={message}/>
                        </div>
                    </>
                ) : (
                    <MessageRowContent message={message} className="ml-13"/>
                )}
            </div>
        </div>
    );
}

function MessageRowContent({ message, ...props }: { message: MessageDto } & HTMLAttributes<HTMLDivElement>) {
    const messageStatus: "sending" | "error" | undefined = (message as QueuedMessage).__status;

    return (
        <div {...props}>
            {message.body && (
                <p className={`text-sm leading-6 whitespace-pre-wrap ${messageStatus === "sending" ? "text-gray-400 animate-pulse" : messageStatus === "error" ? "text-red-500" : "text-white"}`}>{message.body}</p>
            )}
        </div>
    )
}