import type {Attachment, MessageDto, UserBasicProfileSummary} from "../api/responses.ts";
import {layout, type LayoutResult, prepare, type PreparedText} from "@chenglou/pretext";
import {type ReactNode, useEffect, useLayoutEffect, useRef, useState} from "react";
import ChatInput, {type ChatInputMessageState} from "./ChatInput.tsx";
import type {ReactVirtualizer} from "@tanstack/react-virtual";
import {useResizeObserver} from "usehooks-ts";
import MediaPreviewGallery from "./MediaPreviewGallery.tsx";
import {messageService} from "../api/messageService.ts";
import VirtualizedScrollList from "./VirtualizedScrollList.tsx";
import Spinner from "./Spinner.tsx";
import UserAvatar from "./UserAvatar.tsx";
import {ScrollArea} from "radix-ui";

export type QueueableMessage = MessageDto & { queueStatus?: 'sending' | 'error' };

export type MessageDisplayInfo = {
    userInfo?: UserBasicProfileSummary;
};

type MediaGalleryState = {
    items: { id: string; type: string }[];
    currentIndex: number;
};

const BODY_FONT = '14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const BODY_LINE_HEIGHT = 24;
const MESSAGE_ATTACHMENT_BOTTOM_PADDING = 4;

const preparedCache = new Map<string, PreparedText>();

function fallbackTextHeight(text: string, width: number) {
    const averageCharacterWidth = 7;
    const charactersPerLine = Math.max(1, Math.floor(width / averageCharacterWidth));

    return text.split('\n').reduce((height, paragraph) => {
        const lineCount = Math.max(1, Math.ceil(paragraph.length / charactersPerLine));
        return height + lineCount * BODY_LINE_HEIGHT;
    }, 0);
}

function getPreparedMessage(message: MessageDto): PreparedText | null {
    if (!message.body) return null;

    const key = message.id;
    const cached = preparedCache.get(key);

    if (cached) return cached;

    const prepared = prepare(message.body, BODY_FONT, {
        whiteSpace: 'pre-wrap',
        wordBreak: 'normal',
    });

    preparedCache.set(key, prepared);
    return prepared;
}

function estimateMessageBodyHeight(message: MessageDto, viewportWidth: number): number {
    viewportWidth = viewportWidth - 16 - 52;

    if (!message.body) return 0;

    const textWidth = Math.max(1, viewportWidth);
    const isSupported: boolean = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

    if (!isSupported) {
        return fallbackTextHeight(message.body, textWidth);
    }

    const layoutResult: LayoutResult = layout(getPreparedMessage(message)!, textWidth, BODY_LINE_HEIGHT);
    return layoutResult.height;
}

export interface ChatViewProps {
    messages: QueueableMessage[];
    messageDisplayInfo: MessageDisplayInfo[];
    isLoading: boolean;
    hasPreviousPage: boolean;
    isFetchingPreviousPage: boolean;
    fetchPreviousPage: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    onSendMessage: (payload: ChatInputMessageState) => void;
    isInputDisabled?: boolean;
    emptyState?: () => ReactNode;
}

export function ChatView({
     messages,
     messageDisplayInfo,
     isLoading,
     hasPreviousPage,
     isFetchingPreviousPage,
     fetchPreviousPage,
     hasNextPage,
     isFetchingNextPage,
     fetchNextPage,
     onSendMessage,
     isInputDisabled,
     emptyState,
 }: ChatViewProps) {
    const viewportRef = useRef<HTMLDivElement>(null!);
    const virtualizerRef = useRef<ReactVirtualizer<HTMLDivElement, Element>>(null!);

    const [isReady, setIsReady] = useState(false);
    const { width: viewportWidth = 0 } = useResizeObserver({ ref: viewportRef });

    // jump to the bottom when the messages are rendered
    useLayoutEffect(() => {
        if (messages.length > 0 && !isReady) {
            requestAnimationFrame(() => {
                const virtualizer = virtualizerRef.current;
                if (!virtualizer) return;

                virtualizer.scrollToIndex(virtualizer.options.count - 1, { align: 'end' });

                requestAnimationFrame(() => setIsReady(true));
            });
        } else if (!isLoading && messages.length === 0) {
            setIsReady(true);
        }
    }, [messages.length, isLoading, isReady]);

    // jump to bottom automatically when something arrive.
    const previousMessageCount = useRef(messages.length);

    useEffect(() => {
        if (messages.length > previousMessageCount.current && isReady) {
            const distanceFromBottom = viewportRef.current.scrollHeight - viewportRef.current.scrollTop - viewportRef.current.clientHeight;

            // why not == 0? idk im too tired to think about it lmao
            const isNearBottom = distanceFromBottom < 50;

            if (isNearBottom) {
                requestAnimationFrame(() => {
                    const virtualizer = virtualizerRef.current;
                    if (!virtualizer) return;

                    virtualizer.scrollToIndex(virtualizer.options.count - 1, {align: 'end'});
                });
            }
        }

        previousMessageCount.current = messages.length;
    }, [messages.length, isReady]);

    // gallery
    const [galleryState, setGalleryState] = useState<MediaGalleryState | null>(null);

    const handleAttachmentClick = (messageAttachments: Attachment[], clickedIndex: number) => {
        setGalleryState({
            items: messageAttachments.map(att => ({ id: att.id, type: att.type })),
            currentIndex: clickedIndex
        });
    };

    return (
        <div className="flex flex-col overflow-hidden size-full text-white bg-gray-700">
            <MediaPreviewGallery
                open={galleryState !== null}
                onOpenChange={(state) => {
                    if (!state) setGalleryState(null);
                }}
                initialItem={galleryState ? {
                    source: messageService.getAttachmentUrl(galleryState.items[galleryState.currentIndex].id, false),
                    type: galleryState.items[galleryState.currentIndex].type
                } : { source: "", type: "" }}
                hasPreviousItem={() => galleryState !== null && galleryState.currentIndex > 0}
                getPreviousItem={() => {
                    const prevIndex = galleryState!.currentIndex - 1;
                    setGalleryState({ ...galleryState!, currentIndex: prevIndex });

                    return {
                        source: messageService.getAttachmentUrl(galleryState!.items[prevIndex].id, false),
                        type: galleryState!.items[prevIndex].type
                    };
                }}
                hasNextItem={() => galleryState !== null && galleryState.currentIndex < galleryState.items.length - 1}
                getNextItem={() => {
                    const nextIndex = galleryState!.currentIndex + 1;
                    setGalleryState({ ...galleryState!, currentIndex: nextIndex });

                    return {
                        source: messageService.getAttachmentUrl(galleryState!.items[nextIndex].id, false),
                        type: galleryState!.items[nextIndex].type
                    };
                }}
            />

            <VirtualizedScrollList
                virtualizerRef={virtualizerRef}
                viewportRef={viewportRef}
                className="flex-1 min-h-0 pb-2"
                containerClassName="mt-auto"
                items={messages}
                keyExtractor={(item) => item.id}
                isLoading={isLoading}
                estimateSize={(index) => {
                    const prevOffset = hasPreviousPage ? 1 : 0;
                    if ((hasPreviousPage && index == 0) || (hasNextPage && index == prevOffset + messages.length)) {
                        return 30; // Loader size
                    }

                    const message = messages[index - prevOffset];
                    const displayInfo = messageDisplayInfo[index - prevOffset];
                    if (!message) return 52;

                    const showProfile = !message.queueStatus && !!displayInfo?.userInfo;
                    const bodyHeight = estimateMessageBodyHeight(message, viewportWidth);
                    const attachmentHeight = message.attachments && message.attachments.length > 0
                        ? (message.queueStatus ? 24 : 128 + MESSAGE_ATTACHMENT_BOTTOM_PADDING)
                        : 0;

                    return bodyHeight + attachmentHeight + (showProfile ? 24 : 0);
                }}
                hasPreviousPage={hasPreviousPage}
                isFetchingPreviousPage={isFetchingPreviousPage}
                fetchPreviousPage={() => {
                    if (isReady) {
                        fetchPreviousPage();
                    }
                }}
                renderFetchingPrevious={() => (
                    <div className="size-6 flex flex-row justify-center items-center w-full">
                        <Spinner className="size-6 fill-white"/>
                    </div>
                )}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                fetchNextPage={fetchNextPage}
                renderFetchingNext={() => (
                    <div className="size-6 flex flex-row justify-center items-center w-full">
                        <Spinner className="size-6 fill-white"/>
                    </div>
                )}
                renderEmpty={() => {
                    return emptyState && (
                        <div className="flex flex-1 select-none justify-center items-end text-gray-300 pb-3">
                            {emptyState()}
                        </div>
                    );
                }}
                renderItem={(item, _virtualItem, itemIndex) => (
                    <MessageRow
                        message={item}
                        displayInfo={messageDisplayInfo[itemIndex] ?? { userInfo: undefined }}
                        onAttachmentClick={handleAttachmentClick}
                    />
                )}
            />

            <ChatInput
                disabled={isInputDisabled}
                onSendMessage={onSendMessage}
            />
        </div>
    );
}

interface MessageRowProps {
    message: QueueableMessage;
    displayInfo: MessageDisplayInfo;
    onAttachmentClick: (attachments: Attachment[], index: number) => void;
}

function MessageRow({ message, displayInfo, onAttachmentClick }: MessageRowProps) {
    return (
        <div className={`w-full ${message.queueStatus ? "" : "hover-highlight"}`}>
            <div className="flex flex-row gap-3 mx-2">
                {displayInfo.userInfo ? (
                    <>
                        <UserAvatar
                            hasAvatar={displayInfo.userInfo.hasAvatar}
                            userId={message.senderUserId}
                            className="flex-none mt-1 h-10 aspect-square self-stretch select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-base text-white">{displayInfo.userInfo.userName}</p>
                            <MessageRowContent message={message} onAttachmentClick={onAttachmentClick}/>
                        </div>
                    </>
                ) : (
                    <div className="ml-13 min-w-0">
                        <MessageRowContent message={message} onAttachmentClick={onAttachmentClick}/>
                    </div>
                )}
            </div>
        </div>
    );
}

function MessageRowContent({ message, onAttachmentClick }: { message: QueueableMessage, onAttachmentClick: (attachments: Attachment[], index: number) => void }) {
    const messageStatus = message.queueStatus;

    return (
        <>
            {message.body && (
                <p className={`text-sm leading-6 whitespace-pre-wrap ${messageStatus === "sending" ? "text-gray-400 animate-pulse" : messageStatus === "error" ? "text-red-500" : "text-white"}`}>
                    {message.body}
                </p>
            )}

            {message.attachments && message.attachments.length > 0 && (
                messageStatus ? (
                    <p className={`text-sm leading-6 whitespace-pre-wrap ${messageStatus === "sending" ? "text-gray-400 animate-pulse" : "text-red-500"}`}>{`<${message.attachments.length} attachment${message.attachments.length > 1 ? 's' : ''}>`}</p>
                ) : (
                    <ScrollArea.Root className="h-32 w-full overflow-hidden group">
                        <ScrollArea.Viewport className="size-full [&>div]:flex! [&>div]:h-full [&>div]:flex-col">
                            <div className="flex flex-row gap-1 w-max h-full group-has-data-[state=visible]:pb-3">
                                {message.attachments.map((attachment, index) => (
                                    <div
                                        key={attachment.id}
                                        className="flex-none overflow-hidden relative group h-full aspect-square rounded-md border border-gray-500 cursor-pointer"
                                        onClick={() => onAttachmentClick(message.attachments, index)}
                                    >
                                        {attachment.type.startsWith("image") && (
                                            <img
                                                src={messageService.getAttachmentUrl(attachment.id, false)}
                                                alt="attachment"
                                                className="object-cover size-full"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea.Viewport>
                        <ScrollArea.Scrollbar className="flex flex-col h-2 touch-none select-none p-0.5 transition-colors duration-160 ease-out hover-highlight" orientation="horizontal">
                            <ScrollArea.Thumb className="relative flex-1 rounded-[10px] bg-gray-400 before:absolute before:left-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2" />
                        </ScrollArea.Scrollbar>
                    </ScrollArea.Root>
                )
            )}
        </>
    );
}