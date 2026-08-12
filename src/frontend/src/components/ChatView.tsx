import type {Attachment, GetMessagesResponse, MessageDto, TimelineMessageDto, TimelineMessageBlockDto, UserIdentityProfileDto} from "../api/responses.ts";
import {layout, type LayoutResult, prepare, type PreparedText} from "@chenglou/pretext";
import {type ReactNode, useEffect, useLayoutEffect, useRef, useState, type RefObject, useImperativeHandle} from "react";
import {type ReactVirtualizer} from "@tanstack/react-virtual";
import {useResizeObserver} from "usehooks-ts";
import MediaPreviewGallery from "./MediaPreviewGallery.tsx";
import {messageService} from "../api/messageService.ts";
import VirtualizedScrollList from "./VirtualizedScrollList.tsx";
import Spinner from "./Spinner.tsx";
import useGetMessages from "../hooks/useGetMessages.ts";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import useSignalREvent from "../hooks/useSignalREvent.ts";
import type { MessageEditedEvent, MessageReceivedEvent } from "../api/events.ts";
import { useCacheService } from "../hooks/useCacheService.ts";
import AlertActionDialog from "./AlertActionDialog.tsx";
import SenderMessageCluster, {type MessageGroupRowProps} from "./SenderMessageCluster.tsx";
import {useChatContainerContext} from "../contexts/ChatContainerContext.tsx";

type MediaGalleryState = {
    items: { id: string; type: string }[];
    currentIndex: number;
};

type CachedMessage = {
    prepared: PreparedText;
    content: string;
};

const BODY_FONT = '14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const BODY_LINE_HEIGHT = 24;
const BODY_ATTACHMENT_PADDING = 4;
const MESSAGE_ATTACHMENT_BOTTOM_PADDING = 4;

const preparedCache = new Map<string, CachedMessage>();
const MAX_PREPARED_CACHE_SIZE = 512;

// function fallbackTextHeight(text: string, width: number) {
//     const averageCharacterWidth = 7;
//     const charactersPerLine = Math.max(1, Math.floor(width / averageCharacterWidth));
//
//     return text.split('\n').reduce((height, paragraph) => {
//         const lineCount = Math.max(1, Math.ceil(paragraph.length / charactersPerLine));
//         return height + lineCount * BODY_LINE_HEIGHT;
//     }, 0);
// }

function ensurePreparedMessage(id: string, content: string): PreparedText | null {
    if (!content) return null;

    // re-insert on hit to refresh the position
    if (preparedCache.has(id)) {
        const cached = preparedCache.get(id)!;

        if (cached.content === content) {
            // Re-insert on hit to refresh LRU order
            preparedCache.delete(id);
            preparedCache.set(id, cached);
            return cached.prepared;
        }
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

    preparedCache.set(id, { prepared, content });
    return prepared;
}

function getPreparedMessage(id: string): CachedMessage | null {
  if (!preparedCache.has(id)) return null;

  const cached = preparedCache.get(id)!;
  preparedCache.delete(id);
  preparedCache.set(id, cached);
  return cached;
}

function estimateMessageContentLayout(id: string, displayAreaWidth: number): { height: number, lineCount: number } {
    const cached = getPreparedMessage(id);
    if (!cached) return { height: BODY_LINE_HEIGHT, lineCount: 1 };

    const isSupported: boolean = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

    if (!isSupported) {
        console.error("pretext is not supported.");
        return { height: 0, lineCount: 0 };
    } else {
        const layoutResult: LayoutResult = layout(cached.prepared, displayAreaWidth, BODY_LINE_HEIGHT);
        return { height: layoutResult.height, lineCount: layoutResult.lineCount };
    }
}

function estimateMessageGroupHeight(
    messageGroup: TimelineMessageBlockDto,
    displayAreaWidth: number,
    editingMessageId: string | undefined,
    editingMessageDraft: string | null
): number {
    displayAreaWidth = Math.max(1, displayAreaWidth);

    return messageGroup.messages.reduce((acc: number, msg: TimelineMessageDto) => {
        const isEditing = msg.id === editingMessageId;

        // calculate the reply
        if (msg.replyTo) {
            // the size of the text displaying "<Sender name" sent:" plus mb-1
            acc += 16 + 4;

            // if the reply message has body
            if (msg.replyTo.body) {
                // add at maximum 2 lines of content
                ensurePreparedMessage(msg.replyTo.messageId, msg.replyTo.body);

                const { lineCount } = estimateMessageContentLayout(msg.replyTo.messageId, displayAreaWidth);
                const effectiveLines = Math.min(lineCount, 2);
                acc += effectiveLines * BODY_LINE_HEIGHT;
                acc += 4;   // py-0.5
            } else {
                // 1 line to show how many attachment it has
                acc += BODY_LINE_HEIGHT;
            }
        }

        // if the message is being edited, calculate the height of the draft textarea
        if (isEditing) {
            const draftId = `${msg.id}_edit-draft`;
            let currentDraft: string = editingMessageDraft ?? msg.body ?? "";

            ensurePreparedMessage(draftId, currentDraft);

            // subtract 24 cuz textarea because px-3
            let contentHeight = estimateMessageContentLayout(draftId, displayAreaWidth - 24).height;
            contentHeight = Math.max(BODY_LINE_HEIGHT, contentHeight);  // ensure it has 1 line worth of text if draft empty

            // pretext doesn't include the last line break to calculate height for some reason
            if (currentDraft.endsWith("\n")) {
                contentHeight += BODY_LINE_HEIGHT;
            }

            const textareaHeight = contentHeight + 16;  // textarea has py-2
            const constrainedTextareHeight = Math.min(textareaHeight, 160); // textarea has max-h-40

            acc += constrainedTextareHeight;
        } else if (msg.body) {
            // add height of message body
            ensurePreparedMessage(msg.id, msg.body);
            acc += estimateMessageContentLayout(msg.id, displayAreaWidth).height;
        }

        // attachments
        if (msg.attachments && msg.attachments.length > 0) {
            // if message has body, add a small padding between them
            acc += msg.body ? BODY_ATTACHMENT_PADDING : 0;
            acc += 128 + MESSAGE_ATTACHMENT_BOTTOM_PADDING;
        }

        // the key instructions when the message is being edited (enter and escape).
        if (isEditing) {
            acc += 20;  // 16 for the text, 4 for gap between it above
        }

        return acc;
    }, BODY_LINE_HEIGHT);   // username header start
}

export interface QueryModification {
    appendMessage: (message: MessageDto, userProfile?: UserIdentityProfileDto) => void;
    editMessage: (messageId: string, newBody: string | null) => void;
    deleteMessage: (messageId: string) => void;
}

export interface ChatViewProps {
    renderEmptyState?: () => ReactNode;
    queryModificationRef?: RefObject<QueryModification>;
}

export function ChatView({
    renderEmptyState,
    queryModificationRef,
}: ChatViewProps) {
    const { channelId, onMessageEdit, onMessageDelete, onMessageReplyRequested } = useChatContainerContext()!;

    const viewportRef = useRef<HTMLDivElement>(null!);
    const virtualizerRef = useRef<ReactVirtualizer<HTMLDivElement, Element>>(null!);

    const cacheService = useCacheService();
    const queryClient = useQueryClient();

    // querying
    const {
        useInfiniteQueryResult: {
            hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage, hasNextPage, isFetchingNextPage, fetchNextPage,
            isLoading,
        },
        allMessageGroups: messageGroups,
        userProfiles,
        queryKey,
        appendMessage,
        editMessage,
        deleteMessage,
    } = useGetMessages(channelId, 50);

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
    const lastGroupMessageCount = messageGroups.length === 0 ? null : messageGroups.at(-1)?.messages.length;

    const previousMessageCount = useRef({
        groupCount: messageGroups.length,
        lastGroupCount: lastGroupMessageCount,
    });

    useEffect(() => {
        if ((messageGroups.length > previousMessageCount.current.groupCount || (lastGroupMessageCount && previousMessageCount.current.lastGroupCount && lastGroupMessageCount > previousMessageCount.current.lastGroupCount)) && isReady) {
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

        previousMessageCount.current = {
            groupCount: messageGroups.length,
            lastGroupCount: lastGroupMessageCount,
        };
    }, [messageGroups.length, messageGroups.at(-1)?.messages.length ?? 0, isReady]);

    // gallery
    const [galleryState, setGalleryState] = useState<MediaGalleryState>({
        items: [],
        currentIndex: 0,
    });

    const handleAttachmentClick = (messageAttachments: Attachment[], clickedIndex: number) => {
        setGalleryState({
            items: messageAttachments.map(att => ({ id: att.id, type: att.type })),
            currentIndex: clickedIndex
        });
    };

    // message editing
    const [editingMessage, setEditingMessage] = useState<MessageDto | undefined>(undefined);
    const [editingMessageDraft, setEditingMessageDraft] = useState<string | null>(null);

    const handleSaveEdit = async (newBody: string) => {
        if (editingMessage === undefined) return;

        setEditingMessage(undefined);
        setEditingMessageDraft(null);

        onMessageEdit(editingMessage, newBody.trim());
    };

    const [deletingMessage, setDeletingMessage] = useState<MessageDto | undefined>(undefined);

    const handleMessageAction: MessageGroupRowProps['onActionTriggered'] = (action, message) => {
        switch (action) {
            case "delete":
                setDeletingMessage(message);
                break;

            case "edit":
                setEditingMessage(message);
                break;

            case "reply":
                onMessageReplyRequested(message);
                break;
        }
    };

    // signalr events
    // change the cache pages when message received
    useSignalREvent("MessageReceived", async (event: MessageReceivedEvent) => {
        const senderId = event.message.senderUserId;

        // check if there is this user summary in any page
        const currentCache = queryClient.getQueryData<InfiniteData<GetMessagesResponse | undefined | null>>(queryKey);
        let knownUser: UserIdentityProfileDto | undefined = undefined;

        if (currentCache?.pages) {
            for (const page of currentCache.pages) {
                if (!page?.users) continue;

                const cached = page.users.find((value) => value.id == senderId);

                if (cached) {
                    knownUser = cached;
                    break;
                }
            }
        }

        // if we don't know this user, fetch from api
        if (!knownUser) {
            try {
                // Replace with your actual user service fetch call
                const response = await cacheService.getUserBasicProfile(senderId);
                knownUser = response.data ?? undefined;
            } catch (error) {
                console.error("Failed to fetch user summary for new message", error);
            }
        }

        appendMessage(event.message, knownUser);
    });

    useSignalREvent("MessageEdited", async (event: MessageEditedEvent) => {
        editMessage(event.message.id, event.message.body);
    });

    useImperativeHandle(queryModificationRef, () => ({
        appendMessage,
        editMessage,
        deleteMessage
    }), [appendMessage, editMessage, deleteMessage]);

    return (
        <div className="flex-1 flex flex-col overflow-hidden h-full text-white bg-gray-700">
            {galleryState.items && galleryState.items.length > 0 && (
                <MediaPreviewGallery
                    open={!!galleryState.items}
                    onOpenChange={(state) => {
                        if (!state) {
                            setGalleryState((prev) => ({
                                ...prev,
                                items: [],
                            }));
                        }
                    }}
                    currentItem={{
                        source: messageService.getAttachmentUrl(galleryState.items[galleryState.currentIndex].id, false),
                        type: galleryState.items[galleryState.currentIndex].type
                    }}
                    hasPreviousItem={galleryState.currentIndex > 0}
                    onPrevious={() => {
                        setGalleryState((prev) => ({
                            ...prev,
                            currentIndex: prev.currentIndex - 1,
                        }));
                    }}
                    hasNextItem={galleryState.currentIndex < galleryState.items.length - 1}
                    onNext={() => {
                        setGalleryState((prev) => ({
                            ...prev,
                            currentIndex: prev.currentIndex + 1,
                        }));
                    }}
                />
            )}

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

                    return estimateMessageGroupHeight(messageGroups[target.itemIndex], viewportWidth - 16 - 52, editingMessage?.id, editingMessageDraft);
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
                fetchNextPage={() => {
                    fetchNextPage();
                }}
                renderFetchingNext={() => (
                    <div className="size-6 flex flex-row justify-center items-center w-full">
                        <Spinner className="size-6 fill-white"/>
                    </div>
                )}
                renderEmpty={() => {
                    return renderEmptyState && (
                        <div className="flex flex-1 select-none justify-center items-end text-gray-300 pb-3">
                            {renderEmptyState()}
                        </div>
                    );
                }}
                renderItem={(itemIndex, virtualItem) => {
                    return (
                        <SenderMessageCluster
                            key={virtualItem.key}
                            messageGroup={messageGroups[itemIndex]}
                            userProfiles={userProfiles}
                            onAttachmentClick={handleAttachmentClick}
                            editingMessageId={editingMessage?.id}
                            editingMessageDraft={editingMessageDraft}
                            onEditDraftChange={setEditingMessageDraft}
                            onActionTriggered={handleMessageAction}
                            onEditCanceled={() => {
                                setEditingMessage(undefined);
                                setEditingMessageDraft(null);
                            }}
                            onEditSaved={handleSaveEdit}
                        />
                    );
                }}
            />

            <AlertActionDialog
                panelClassName="w-128"
                title={"Are you sure?"}
                description={"This action cannot be undone. You will never see this message and its attachments ever again."}
                open={!!deletingMessage}
                onOpenChange={(open) => {
                    if (!open) {
                        setDeletingMessage(undefined);
                    }
                }}
                actionButton={(
                    <button className="button-theme-danger cursor-pointer px-3 py-2 rounded-md" onClick={() => deletingMessage && onMessageDelete(deletingMessage)}>
                        Delete message
                    </button>
                )}
            />
        </div>
    );
}