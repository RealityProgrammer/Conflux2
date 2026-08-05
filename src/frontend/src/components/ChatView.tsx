import type {Attachment, MessageElement, MessageGroup, UserBasicProfileSummary} from "../api/responses.ts";
import {layout, type LayoutResult, prepare, type PreparedText} from "@chenglou/pretext";
import {type ReactNode, useEffect, useLayoutEffect, useRef, useState} from "react";
import {type ReactVirtualizer} from "@tanstack/react-virtual";
import {useResizeObserver} from "usehooks-ts";
import MediaPreviewGallery from "./MediaPreviewGallery.tsx";
import {messageService} from "../api/messageService.ts";
import VirtualizedScrollList from "./VirtualizedScrollList.tsx";
import Spinner from "./Spinner.tsx";
import UserAvatar from "./UserAvatar.tsx";
import {ScrollArea} from "radix-ui";
import MessageGroupRow from "./MessageGroupRow.tsx";

type MediaGalleryState = {
    items: { id: string; type: string }[];
    currentIndex: number;
};

const BODY_FONT = '14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const BODY_LINE_HEIGHT = 24;
const MESSAGE_ATTACHMENT_BOTTOM_PADDING = 4;

const preparedCache = new Map<string, PreparedText>();
const MAX_PREPARED_CACHE_SIZE = 512;

function fallbackTextHeight(text: string, width: number) {
    const averageCharacterWidth = 7;
    const charactersPerLine = Math.max(1, Math.floor(width / averageCharacterWidth));

    return text.split('\n').reduce((height, paragraph) => {
        const lineCount = Math.max(1, Math.ceil(paragraph.length / charactersPerLine));
        return height + lineCount * BODY_LINE_HEIGHT;
    }, 0);
}

function getPreparedMessage(id: string, content: string): PreparedText | null {
    if (!content) return null;

    // re-insert on hit to refresh the position
    if (preparedCache.has(id)) {
        const cached = preparedCache.get(id)!;
        preparedCache.delete(id);
        preparedCache.set(id, cached);
        return cached;
    }

    // evict the oldest text if passed the cache size
    if (preparedCache.size >= MAX_PREPARED_CACHE_SIZE) {
        const oldestKey = preparedCache.keys().next().value;
        if (oldestKey) preparedCache.delete(oldestKey);
    }

    const prepared = prepare(content, BODY_FONT, {
        whiteSpace: 'pre-wrap',
        wordBreak: 'normal',
    });

    preparedCache.set(id, prepared);
    return prepared;
}

function estimateMessageGroupHeight(messageGroup: MessageGroup, displayAreaWidth: number): number {
    displayAreaWidth = Math.max(1, displayAreaWidth);
    const isSupported: boolean = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

    return messageGroup.messages.reduce((acc: number, msg: MessageElement) => {
        if (!msg.body) return acc;

        if (!isSupported) {
            acc += fallbackTextHeight(msg.body, displayAreaWidth);
        } else {
            const layoutResult: LayoutResult = layout(getPreparedMessage(msg.id, msg.body)!, displayAreaWidth, BODY_LINE_HEIGHT);
            acc += layoutResult.height;
        }

        if (msg.attachments && msg.attachments.length > 0) {
            acc += 128 + MESSAGE_ATTACHMENT_BOTTOM_PADDING;
        }

        return acc;
    }, 24);
}

export interface ChatViewProps {
    messageGroups: MessageGroup[];
    userProfiles: Record<string, UserBasicProfileSummary>;
    isLoading: boolean;
    hasPreviousPage: boolean;
    isFetchingPreviousPage: boolean;
    fetchPreviousPage: () => void;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
    emptyState?: () => ReactNode;
}

export function ChatView({
     messageGroups,
     userProfiles,
     isLoading,
     hasPreviousPage,
     isFetchingPreviousPage,
     fetchPreviousPage,
     hasNextPage,
     isFetchingNextPage,
     fetchNextPage,
     emptyState,
 }: ChatViewProps) {
    const viewportRef = useRef<HTMLDivElement>(null!);
    const virtualizerRef = useRef<ReactVirtualizer<HTMLDivElement, Element>>(null!);

    const [isReady, setIsReady] = useState(false);
    const { width: viewportWidth = 0 } = useResizeObserver({ ref: viewportRef });

    // jump to the bottom when the messages are rendered
    useLayoutEffect(() => {
        if (messageGroups.length > 0 && !isReady) {
            requestAnimationFrame(() => {
                const virtualizer = virtualizerRef.current;
                if (!virtualizer) return;

                virtualizer.scrollToIndex(virtualizer.options.count - 1, { align: 'end' });

                requestAnimationFrame(() => setIsReady(true));
            });
        } else if (!isLoading && messageGroups.length === 0) {
            setIsReady(true);
        }
    }, [messageGroups.length, isLoading, isReady]);

    // jump to bottom automatically when something arrive.
    const lastGroupMessageCount = messageGroups.length === 0 ? null : messageGroups.length;

    const previousMessageCount = useRef({
        groupCount: messageGroups.length,
        lastGroupCount: lastGroupMessageCount,
    });

    useEffect(() => {
        if ((messageGroups.length > previousMessageCount.current.groupCount || (lastGroupMessageCount && previousMessageCount.current.lastGroupCount && lastGroupMessageCount > previousMessageCount.current.lastGroupCount)) && isReady) {
            const distanceFromBottom = viewportRef.current.scrollHeight - viewportRef.current.scrollTop - viewportRef.current.clientHeight;

            // why not == 0? idk im too tired to think about it lmao
            const isNearBottom = distanceFromBottom < 10;

            if (isNearBottom) {
                requestAnimationFrame(() => {
                    const virtualizer = virtualizerRef.current;
                    if (!virtualizer) return;

                    virtualizer.scrollToIndex(virtualizer.options.count - 1, {align: 'end'});
                });
            }
        }

        previousMessageCount.current = {
            groupCount: messageGroups.length,
            lastGroupCount: lastGroupMessageCount,
        };
    }, [messageGroups.length, messageGroups.at(-1)?.messages.length ?? 0, isReady]);

    // gallery
    const [galleryState, setGalleryState] = useState<MediaGalleryState | null>(null);

    const handleAttachmentClick = (messageAttachments: Attachment[], clickedIndex: number) => {
        setGalleryState({
            items: messageAttachments.map(att => ({ id: att.id, type: att.type })),
            currentIndex: clickedIndex
        });
    };

    return (
        <div className="flex flex-col overflow-hidden h-full text-white bg-gray-700">
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
                className="flex-1"
                containerClassName="mt-auto"
                itemCount={messageGroups.length}
                keyExtractor={(itemIndex) => messageGroups[itemIndex].messages[0].id}
                isLoading={isLoading}
                estimateSize={(target) => {
                    if (target === 'previousLoader' || target === 'nextLoader') return 30;

                    return estimateMessageGroupHeight(messageGroups[target.itemIndex], viewportWidth - 16 - 52);
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
                renderItem={(itemIndex, virtualItem) => (
                    <MessageGroupRow
                        key={virtualItem.key}
                        messageGroup={messageGroups[itemIndex]}
                        userProfile={userProfiles[messageGroups[itemIndex].senderUserId] ?? undefined}
                        onAttachmentClick={handleAttachmentClick}
                    />
                )}
            />
        </div>
    );
}
