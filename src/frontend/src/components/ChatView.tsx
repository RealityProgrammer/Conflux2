import type {Attachment, GetMessagesResponse, MessageDto, MessageElement, MessageGroup, ServiceResponse, UserBasicProfileSummary} from "../api/responses.ts";
import {layout, type LayoutResult, prepare, type PreparedText} from "@chenglou/pretext";
import {type ReactNode, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ChangeEvent, type RefObject, useImperativeHandle} from "react";
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
import useGetMessages from "../hooks/useGetMessages.ts";
import { userService } from "../api/userService.ts";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import useSignalREvent from "../hooks/useSignalREvent.ts";
import type { MessageEditedEvent, MessageReceivedEvent } from "../api/events.ts";

type MediaGalleryState = {
    items: { id: string; type: string }[];
    currentIndex: number;
};

type CachedMessage = {
    prepared: PreparedText;
    content: string;
}

const BODY_FONT = '14px ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const BODY_LINE_HEIGHT = 24;
const BODY_ATTACHMENT_PADDING = 4;
const MESSAGE_ATTACHMENT_BOTTOM_PADDING = 4;

const preparedCache = new Map<string, CachedMessage>();
const MAX_PREPARED_CACHE_SIZE = 512;

function fallbackTextHeight(text: string, width: number) {
    const averageCharacterWidth = 7;
    const charactersPerLine = Math.max(1, Math.floor(width / averageCharacterWidth));

    return text.split('\n').reduce((height, paragraph) => {
        const lineCount = Math.max(1, Math.ceil(paragraph.length / charactersPerLine));
        return height + lineCount * BODY_LINE_HEIGHT;
    }, 0);
}

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

function estimateMessageContentHeight(id: string, displayAreaWidth: number): number {
    const cached = getPreparedMessage(id);
    if (!cached) return BODY_LINE_HEIGHT;

    const isSupported: boolean = typeof Intl !== 'undefined' && 'Segmenter' in Intl;

    if (!isSupported) {
        return fallbackTextHeight(cached.content, displayAreaWidth);
    } else {
        const layoutResult: LayoutResult = layout(cached.prepared, displayAreaWidth, BODY_LINE_HEIGHT);
        return layoutResult.height;
    }
}

function estimateMessageGroupHeight(
    messageGroup: MessageGroup,
    displayAreaWidth: number,
    editingMessageId: string | null,
    editingMessageDraft: string | null
): number {
    displayAreaWidth = Math.max(1, displayAreaWidth);

    return messageGroup.messages.reduce((acc: number, msg: MessageElement) => {
        const isEditing = msg.id === editingMessageId;

        if (msg.body) {
            if (isEditing) {
                // alright trailing new line breaks the height calculation for some reason that im too tired to give a damn so...
                // imma use a hack for this: calculate the amount of trailing new line, and multiply with line height

                const draftId = `${msg.id}_edit-draft`;
                let currentDraft: string = editingMessageDraft ?? msg.body ?? "";

                // if (currentDraft.endsWith('\n')) {
                //     currentDraft += '\u200b';
                // }

                ensurePreparedMessage(draftId, currentDraft);

                // add 16 cuz input is py-2, subtract 24 cuz input hs px-3
                let contentHeight = estimateMessageContentHeight(draftId, displayAreaWidth - 24);   // subtract 24 for textarea x padding

                if (currentDraft.endsWith("\n")) {
                    contentHeight += BODY_LINE_HEIGHT;  // pretext doesn't include the last line break to calculate height for some reason
                }

                const textareaHeight = contentHeight + 16;  // textarea y padding
                const constrainedTextareHeight = Math.min(textareaHeight, 160); // textarea has max-h-40

                acc += constrainedTextareHeight;
            } else {
                ensurePreparedMessage(msg.id, msg.body);
                acc += estimateMessageContentHeight(msg.id, displayAreaWidth);
            }
        }

        if (msg.attachments && msg.attachments.length > 0) {
            // if has body, add a small padding between them
            acc += msg.body ? BODY_ATTACHMENT_PADDING : 0;
            acc += 128 + MESSAGE_ATTACHMENT_BOTTOM_PADDING;
        }

        if (isEditing) {
            acc += 20;  // 16 for the escape to cancel, enter to save message, 4 for gap between it and textarea above
        }

        return acc;
    }, 24);
}

export interface QueryModification {
    pushNewMessage: (message: MessageDto, userProfile?: UserBasicProfileSummary) => void;
    editMessage: (messageId: string, newBody: string | null) => void;
}

export interface ChatViewProps {
    channelId: string;
    emptyState?: () => ReactNode;
    onMessageEditRequested: (messageId: string, newBody: string | null) => void;
    queryModificationRef?: RefObject<QueryModification>;
}

export function ChatView({
    channelId,
    emptyState,
    onMessageEditRequested,
    queryModificationRef,
 }: ChatViewProps) {
    const viewportRef = useRef<HTMLDivElement>(null!);
    const virtualizerRef = useRef<ReactVirtualizer<HTMLDivElement, Element>>(null!);

    const queryClient = useQueryClient();

    // querying
    const {
        useInfiniteQueryResult: {
            hasPreviousPage, isFetchingPreviousPage, fetchPreviousPage, hasNextPage, isFetchingNextPage, fetchNextPage,
            isLoading,
        },
        allMessageGroups: messageGroups,
        userProfiles,
        queryKey
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

    const pushNewMessage = (newMessage: MessageDto, userSummary?: UserBasicProfileSummary) => {
        queryClient.setQueryData<InfiniteData<GetMessagesResponse | undefined | null>>(
            queryKey,
            (oldData) => {
                if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                    return oldData;
                }

                const lastPage = oldData.pages.at(-1)!;
                const updatedLastPage = { ...lastPage };

                if (userSummary && !lastPage.users.map(u => u.id).includes(newMessage.senderUserId)) {
                    updatedLastPage.users = [...(updatedLastPage.users || []), userSummary];
                }

                const currentGroups = updatedLastPage.messageGroups || [];

                if (lastPage.messageGroups?.length > 0) {
                    const lastMessageGroup = lastPage.messageGroups.at(-1)!;

                    // was the new message sent by the same person on the last group of the last page?
                    const isSameUser =
                        lastMessageGroup.senderUserId == newMessage.senderUserId;

                    if (isSameUser) {
                        const updatedGroup: MessageGroup = {
                            ...lastMessageGroup,
                            messages: [...lastMessageGroup.messages, newMessage],
                        };

                        updatedLastPage.messageGroups = [
                            ...currentGroups.slice(0, -1),
                            updatedGroup,
                        ];
                    } else {
                        updatedLastPage.messageGroups = [
                            ...currentGroups,
                            {
                                senderUserId: newMessage.senderUserId,
                                messages: [newMessage],
                            },
                        ];
                    }
                } else {
                    updatedLastPage.messageGroups = [
                        {
                            senderUserId: newMessage.senderUserId,
                            messages: [newMessage],
                        },
                    ];
                }

                return {
                    ...oldData,
                    pages: [...oldData.pages.slice(0, -1), updatedLastPage],
                };
            }
        );
    };

    // message editing
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingMessageDraft, setEditingMessageDraft] = useState<string | null>(null);

    const editMessage = (messageId: string, newBody: string | null) => {
        queryClient.setQueryData<InfiniteData<GetMessagesResponse | undefined | null>>(
            queryKey,
            (oldData) => {
                if (!oldData || !oldData.pages || oldData.pages.length === 0) {
                    return oldData;
                }

                let isMessageFound = false;

                const updatedPages = oldData.pages.map((page: GetMessagesResponse | null | undefined): GetMessagesResponse | null | undefined => {
                    if (!page) return page;

                    const updatedMessageGroups = page.messageGroups.map((messageGroup: MessageGroup): MessageGroup => {
                        const messageIndex = messageGroup.messages.findIndex((m) => m.id === messageId);

                        if (messageIndex !== -1) {
                            isMessageFound = true;

                            const updatedMessages = [...messageGroup.messages];

                            updatedMessages[messageIndex] = { ...updatedMessages[messageIndex], body: newBody};

                            return {
                                ...messageGroup,
                                messages: updatedMessages,
                            };
                        }

                        return messageGroup;
                    });

                    if (!isMessageFound) {
                        return page;
                    }

                    return {
                        ...page,
                        messageGroups: updatedMessageGroups,
                    };
                });

                if (!isMessageFound) {
                    return oldData;
                }

                return {
                    ...oldData,
                    pages: updatedPages,
                };
            }
        );
    };

    const handleEditSaved = async (newBody: string) => {
        if (!editingMessageId) return;

        setEditingMessageId(null);
        setEditingMessageDraft(null);

        onMessageEditRequested(editingMessageId, newBody.trim());
    };

    // signalr events
    // change the cache pages when message received
    useSignalREvent("MessageReceived", async (event: MessageReceivedEvent) => {
        const senderId = event.message.senderUserId;

        // check if there is this user summary in any page
        const currentCache = queryClient.getQueryData<InfiniteData<GetMessagesResponse | undefined | null>>(queryKey);
        let knownUser: UserBasicProfileSummary | undefined = undefined;

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
                const response = await userService.getUserBasicProfile(senderId);
                knownUser = response.data ?? undefined;
            } catch (error) {
                console.error("Failed to fetch user summary for new message", error);
            }
        }

        pushNewMessage(event.message, knownUser);
    });

    useSignalREvent("MessageEdited", async (event: MessageEditedEvent) => {
        console.log("received message edited event:", JSON.stringify(event));

        editMessage(event.message.id, event.message.body);
    });

    useImperativeHandle(queryModificationRef, () => ({
        pushNewMessage,
        editMessage,
    }), [channelId]);

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

                    return estimateMessageGroupHeight(messageGroups[target.itemIndex], viewportWidth - 16 - 52, editingMessageId, editingMessageDraft);
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
                            editingMessageDraft={editingMessageDraft} // 👈 NEW
                            onEditDraftChange={setEditingMessageDraft} // 👈 NEW
                            onEditTriggered={(messageId) => {
                                setEditingMessageId(messageId);
                            }}
                            onEditCanceled={() => {
                                setEditingMessageId(null);
                                setEditingMessageDraft(null);
                            }}
                            onEditSaved={handleEditSaved}
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
    editingMessageDraft?: string | null;
    onEditDraftChange: (draft: string) => void;
    onEditTriggered?: (messageId: string) => void;
    onEditCanceled: () => void;
    onEditSaved: (newBody: string) => void;
}

function MessageGroupRow({
    messageGroup,
    userProfile,
    onAttachmentClick,
    editingMessageId,
    editingMessageDraft,
    onEditDraftChange,
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
                            editingMessageDraft={editingMessageDraft}
                            onEditDraftChange={onEditDraftChange}
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
                            editingMessageDraft={editingMessageDraft}
                            onEditDraftChange={onEditDraftChange}
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
    editingMessageDraft?: string | null;
    onEditDraftChange: (draft: string) => void;
    onEditCanceled: () => void;
    onEditSaved: (newBody: string) => void;
}

function MessageElement({
    message,
    onAttachmentClick,
    mode,
    editingMessageDraft,
    onEditDraftChange,
    onEditCanceled,
    onEditSaved
}: MessageElementProps) {
    return (
        <>
            {message.body && (
                mode === 'edit' ? (
                    <MessageEditor
                        initialValue={message.body}
                        draftValue={editingMessageDraft}
                        onDraftChange={onEditDraftChange}
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
    draftValue?: string | null;
    onDraftChange: (newDraft: string) => void;
    onSave: (newBody: string) => void;
    onCancel: () => void;
    disabled?: boolean;
}

function MessageEditor({ initialValue, draftValue, onDraftChange, onSave, onCancel, disabled }: MessageEditorProps) {
    const currentText = draftValue ?? initialValue;
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
        const newValue = e.target.value;
        onDraftChange(newValue);

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
        const trimmedBody = currentText.trim();

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
                value={currentText}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                maxLength={1024}
                className="block input-field min-h-10 max-h-40 w-full text-sm resize-none py-2 px-3 overflow-y-auto leading-6 whitespace-pre-wrap"
            />

            <span className="text-xs text-gray-400">
                Escape to <span className="text-blue-400 cursor-pointer hover:underline" onClick={onCancel}>cancel</span>
                {" "}&#x2E31;{" "}  {/*Explicit spacing*/}
                Enter to <span className="text-blue-400 cursor-pointer hover:underline" onClick={submitEdit}>save</span>
            </span>
        </div>
    );
}
