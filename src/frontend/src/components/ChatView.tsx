import type {Attachment, MessageDto, MessageElement, MessageGroup, UserBasicProfileSummary} from "../api/responses.ts";
import {layout, type LayoutResult, prepare, type PreparedText} from "@chenglou/pretext";
import {type ReactNode, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ChangeEvent} from "react";
import {type ReactVirtualizer} from "@tanstack/react-virtual";
import {useResizeObserver} from "usehooks-ts";
import MediaPreviewGallery from "./MediaPreviewGallery.tsx";
import {messageService} from "../api/messageService.ts";
import VirtualizedScrollList from "./VirtualizedScrollList.tsx";
import Spinner from "./Spinner.tsx";
import { ContextMenu, ScrollArea } from "radix-ui";
import { BsCopy, BsPencil, BsTrash } from "react-icons/bs";
import UserAvatar from "./UserAvatar.tsx";
import { useAuthorization } from "../contexts/AuthContext.tsx";

type MediaGalleryState = {
    items: { id: string; type: string }[];
    currentIndex: number;
};

const BODY_FONT = '14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const BODY_LINE_HEIGHT = 24;
const BODY_ATTACHMENT_PADDING = 4;
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

function estimateMessageContentHeight(id: string, content: string, displayAreaWidth: number): number {
    const isSupported: boolean = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

    if (!isSupported) {
        return fallbackTextHeight(content, displayAreaWidth);
    } else {
        const layoutResult: LayoutResult = layout(getPreparedMessage(id, content)!, displayAreaWidth, BODY_LINE_HEIGHT);
        return layoutResult.height;
    }
}

function estimateMessageGroupHeight(messageGroup: MessageGroup, displayAreaWidth: number, editingMessageId: string): number {
    displayAreaWidth = Math.max(1, displayAreaWidth);

    return messageGroup.messages.reduce((acc: number, msg: MessageElement) => {
        if (msg.body) {
            if (msg.id === editingMessageId) {
                // add 16 cuz input is py-2, subtract 24 cuz input hs px-3

                acc += estimateMessageContentHeight(msg.id, msg.body, displayAreaWidth - 24);   // subtract 24 for textarea x padding
                acc += 16;  // textarea y padding
                acc += 20;  // 16 for the escape to cancel, enter to save message, 4 for gap between it and textarea above
            } else {
                acc += estimateMessageContentHeight(msg.id, msg.body, displayAreaWidth);
            }
        }

        if (msg.attachments && msg.attachments.length > 0) {
            // if has body, add a small padding between them
            acc += msg.body ? BODY_ATTACHMENT_PADDING : 0;

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

    // message editing
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

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

                    return estimateMessageGroupHeight(messageGroups[target.itemIndex], viewportWidth - 16 - 52, editingMessageId);
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
                renderItem={(itemIndex, virtualItem) => {
                    return (
                        <MessageGroupRow
                            key={virtualItem.key}
                            messageGroup={messageGroups[itemIndex]}
                            userProfile={userProfiles[messageGroups[itemIndex].senderUserId] ?? undefined}
                            onAttachmentClick={handleAttachmentClick}
                            editingMessageId={editingMessageId || undefined}
                            onEditTriggered={(messageId) => {
                                setEditingMessageId(messageId);
                            }}
                            onEditCanceled={() => {
                                setEditingMessageId(null);
                            }}
                            onEditSaved={(newBody: string) => {
                                console.log("update message", editingMessageId, "to new body:", newBody);
                                setEditingMessageId(null);
                            }}
                        />
                    );
                }}
            />
        </div>
    );
}

interface MessageGroupRowProps {
    messageGroup: MessageGroup;
    userProfile: UserBasicProfileSummary | undefined | null;
    onAttachmentClick: (attachments: Attachment[], index: number) => void;
    editingMessageId?: string;
    onEditTriggered?: (messageId: string) => void;
    onEditCanceled: () => void;
    onEditSaved: (newBody: string) => void;
}

function MessageGroupRow({
    messageGroup,
    userProfile,
    onAttachmentClick,
    editingMessageId,
    onEditTriggered,
    onEditCanceled,
    onEditSaved
}: MessageGroupRowProps) {
    const auth = useAuthorization();

    const [selectedMessage, setSelectedMessage] = useState<MessageDto | null>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        const messageElement = target.closest<HTMLElement>("[data-message-id]");

        if (messageElement?.dataset.messageId) {
            const found = messageGroup.messages.find((m) => m.id === messageElement.dataset.messageId);

            if (found) {
                setSelectedMessage({
                    senderUserId: messageGroup.senderUserId,
                    ...found,
                });
                return;
            }
        }

        setSelectedMessage(null);
    };

    return (
        <ContextMenu.Root>
            <ContextMenu.Trigger
                className="w-full flex flex-col"
                onContextMenu={handleContextMenu}
            >
                {/* Header message */}
                <div
                    data-message-id={messageGroup.messages[0].id}
                    className="hover-highlight flex flex-row gap-3 px-2"
                >
                    <UserAvatar
                        hasAvatar={userProfile?.hasAvatar ?? false}
                        userId={userProfile?.id ?? undefined}
                        className="flex-none mt-1 h-10 aspect-square self-stretch select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"
                    />

                    <div className="flex-1 min-w-0">
                        <p className="text-base text-white">{userProfile?.userName ?? "Unknown Sender"}</p>

                        <MessageElement
                            message={messageGroup.messages[0]}
                            onAttachmentClick={onAttachmentClick}
                            mode={editingMessageId === messageGroup.messages[0].id ? 'edit' : 'view'}
                            onEditCanceled={onEditCanceled}
                            onEditSaved={onEditSaved}
                        />
                    </div>
                </div>

                {/* Consecutive messages */}
                {messageGroup.messages.slice(1).map((message) => (
                    <div
                        key={message.id}
                        data-message-id={message.id}
                        className="hover-highlight pl-15 pr-2"
                    >
                        <MessageElement
                            message={message}
                            onAttachmentClick={onAttachmentClick}
                            mode={editingMessageId === message.id ? 'edit' : 'view'}
                            onEditCanceled={onEditCanceled}
                            onEditSaved={onEditSaved}
                        />
                    </div>
                ))}
            </ContextMenu.Trigger>

            <ContextMenu.Portal>
                <ContextMenu.Content
                    className="min-w-60 overflow-hidden rounded-md bg-gray-725 shadow-lg p-1 text-white text-sm border border-gray-500"
                    alignOffset={5}
                >
                    {auth.userAuthorization?.id && auth.userAuthorization.id === messageGroup.senderUserId && (
                        <>
                            <ContextMenu.Item
                                className="dropdown-item-default"
                                onSelect={() => {
                                    if (!selectedMessage) return;

                                    onEditTriggered?.(selectedMessage.id);
                                }}
                            >
                                Edit message <BsPencil className="fill-white size-4 ml-auto"/>
                            </ContextMenu.Item>

                            <ContextMenu.Item
                                className="dropdown-item-danger"
                                onSelect={() => {
                                    if (!selectedMessage) return;
                                }}
                            >
                                Delete message <BsTrash className="fill-red-500 size-4 ml-auto"/>
                            </ContextMenu.Item>
                        </>
                    )}

                    <ContextMenu.Separator className="h-px bg-gray-500 my-1.5"/>

                    {selectedMessage?.body && (
                        <ContextMenu.Item
                            className="dropdown-item-default"
                            onSelect={() => {
                                if (!selectedMessage?.body) return;

                                navigator.clipboard.writeText(selectedMessage.body);
                            }}
                        >
                            Copy text <BsCopy className="fill-white size-4 ml-auto"/>
                        </ContextMenu.Item>
                    )}
                </ContextMenu.Content>
            </ContextMenu.Portal>
        </ContextMenu.Root>
    );
}

interface MessageElementProps {
    message: MessageElement;
    onAttachmentClick: (attachments: Attachment[], index: number) => void;
    mode: 'view' | 'edit';
    onEditCanceled: () => void;
    onEditSaved: (newBody: string) => void;
}

function MessageElement({ message, onAttachmentClick, mode = 'view', onEditCanceled, onEditSaved }: MessageElementProps) {
    return (
        <>
            {message.body && (
                mode === 'edit' ? (
                    <MessageEditor
                        initialValue={message.body}
                        onCancel={onEditCanceled}
                        onSave={onEditSaved}
                    />
                ): (
                    <p className="text-sm leading-6 whitespace-pre-wrap">
                        {message.body}
                    </p>
                )
            )}

            {message.attachments && message.attachments.length > 0 && (
                <ScrollArea.Root className={`h-32 w-full overflow-hidden group mb-1 ${message.body ? 'mt-1' : ''}`}>
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
            )}
        </>
    );
}

interface MessageEditorProps {
    initialValue: string;
    onSave: (newBody: string) => void;
    onCancel: () => void;
    disabled?: boolean;
}

function MessageEditor({ initialValue, onSave, onCancel, disabled }: MessageEditorProps) {
    const [editBody, setEditBody] = useState(initialValue);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;

            requestAnimationFrame(() => {
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
            });
        }
    }, []);

    const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setEditBody(e.target.value);

        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submitEdit();
        } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
        }
    };

    const submitEdit = () => {
        const trimmedBody = editBody.trim();

        if (trimmedBody.length === 0) return;
        if (trimmedBody === initialValue) {
            onCancel();
            return;
        }

        onSave(trimmedBody);
    };

    return (
        <div className="flex flex-col w-full gap-1">
            <textarea
                ref={textareaRef}
                rows={1}
                value={editBody}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                maxLength={1024}
                className="block input-field min-h-10 max-h-40 w-full text-sm resize-none py-2 px-3 overflow-y-auto leading-6"
            />

            <span className="text-xs text-gray-400">
                Escape to <span className="text-blue-400 cursor-pointer hover:underline" onClick={onCancel}>cancel</span>
                {" "}&#x2E31;{" "}  {/*Explicit spacing*/}
                Enter to <span className="text-blue-400 cursor-pointer hover:underline" onClick={submitEdit}>save</span>
            </span>
        </div>
    );
}
