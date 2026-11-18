import type {
  MentionSource,
  MessageAttachmentDto,
  TimelineMessageDto,
} from "../../api/types.ts";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { conversationService } from "../../api/conversationService.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {
  MessageDeletedEvent,
  MessageEditedEvent,
  MessageReceivedEvent,
  ReactionsActionsSynchronizedEvent,
  ReactionsCountsSynchronizedEvent,
} from "../../api/events.ts";
import { useChatContainerContext } from "../../contexts/ChatContainerContext.tsx";
import useTimelineItems from "../../hooks/useTimelineItems.ts";
import type { TimelineContext } from "./TimelineContext.ts";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import useQueryTimelineMessages from "../../hooks/useQueryTimelineMessages.ts";
import { MessageRow } from "./MessageRow.tsx";
import { MessageItem } from "./MessageItem.tsx";
import DeleteMessageConfirmationDialog from "./DeleteMessageConfirmationDialog.tsx";
import useTimelineMessageMutations from "../../hooks/useTimelineMessageMutations.ts";
import { DateSeparator } from "./DateSeparator.tsx";
import { useMediaGalleryStore } from "../../store/useMediaGalleryStore.ts";
import Spinner from "../Spinner.tsx";
import { FaArrowDown } from "react-icons/fa6";
import IconButton from "../IconButton.tsx";
import { useMentionCountStore } from "../../store/useMentionCountStore.ts";
import EditMessageModal from "./EditMessageModal.tsx";
import { ReactionAction } from "../../api/schema.ts";
import { EmojiPanel, type SelectedEmoji } from "./EmojiPanel.tsx";

const LATEST_BUTTON_THRESHOLD = 2000;
const START_INDEX = 100_000_000;
const BOTTOM_THRESHOLD = 150;

type EmojiPanelSide = "top" | "bottom" | "left" | "right";

interface EmojiPanelRequest {
  getRect: () => DOMRect;
  side: EmojiPanelSide;
  onSelect: (emoji: SelectedEmoji) => void;
  onOpenChange?: (open: boolean) => void;
}

interface ChatViewProps {
  allowDeleteMessage?: boolean;
  allowEditMessage?: boolean;
}

function createRectGetter(element: HTMLElement): () => DOMRect {
  const fallbackRect = element.getBoundingClientRect();
  return () =>
    element.isConnected ? element.getBoundingClientRect() : fallbackRect;
}

export function ChatView({
  allowEditMessage = true,
  allowDeleteMessage = true,
}: ChatViewProps) {
  const clearDmMentions = useMentionCountStore(
    (state) => state.clearDmMentions,
  );
  const clearServerChannelMentions = useMentionCountStore(
    (state) => state.clearServerChannelMentions,
  );

  const setMediaElements = useMediaGalleryStore((state) => state.setElements);

  // messaging context and hooks
  const {
    handleEditMessage,
    handleDeleteMessage,
    setReplyingMessage,
    removeSendOperation,
    retrySendOperation,
    retryEditOperation,
    removeEditOperation,
    conversationId,
    jumpMessageId,
    clearJump,
  } = useChatContainerContext();

  const [anchorId, setAnchorId] = useState<string | null>(null);

  const {
    data: messagePages,
    isFetchingPreviousPage,
    hasPreviousPage,
    fetchPreviousPage,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    isLoading,
  } = useQueryTimelineMessages(conversationId, anchorId);

  useEffect(() => {
    (async () => {
      const mentionSource: MentionSource | null =
        await conversationService.markMentionNotificationsAsRead(
          conversationId,
        );

      if (mentionSource) {
        switch (mentionSource.$type) {
          case "dm":
            clearDmMentions(mentionSource.peerUserId);
            break;

          case "server":
            clearServerChannelMentions(
              mentionSource.serverId,
              mentionSource.channelId,
            );
            break;
        }
      }
    })();
  }, [conversationId]);

  const {
    appendMessage,
    updateMessage,
    updatePinStatus,
    deleteMessage,
    updateReactionsCounts,
    updateUserReactionKeys,
  } = useTimelineMessageMutations(conversationId);

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);

  const [editingMessage, setEditingMessage] = useState<
    TimelineMessageDto | undefined
  >(undefined);
  const prevAllowEditRef = useRef(allowEditMessage);

  useEffect(() => {
    if (prevAllowEditRef.current && !allowEditMessage) {
      setEditingMessage(undefined);
    }

    prevAllowEditRef.current = allowEditMessage;
  }, [allowEditMessage]);

  const [deletingMessage, setDeletingMessage] = useState<
    TimelineMessageDto | undefined
  >(undefined);
  const prevAllowDeleteRef = useRef(allowDeleteMessage);

  useEffect(() => {
    if (prevAllowDeleteRef.current && !allowDeleteMessage) {
      setDeletingMessage(undefined);
    }

    prevAllowDeleteRef.current = allowDeleteMessage;
  }, [allowDeleteMessage]);

  const timelineItems = useTimelineItems(messagePages);

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const showScrollBottomRef = useRef(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef(0);
  const suppressScrollRef = useRef(false);

  const [highlightedMessageId, setHighlightedMessageId] = useState<
    string | null
  >(null);

  const userAtBottomRef = useRef(true);

  useEffect(() => {
    if (!highlightedMessageId) return;

    const t = setTimeout(() => setHighlightedMessageId(null), 1500);
    return () => clearTimeout(t);
  }, [highlightedMessageId]);

  const updateScrollBottomVisibility = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const distance =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    const anchorViewNotLatest = !!anchorId && hasNextPage;

    const shouldShow =
      distance >= LATEST_BUTTON_THRESHOLD || anchorViewNotLatest;

    if (showScrollBottomRef.current !== shouldShow) {
      showScrollBottomRef.current = shouldShow;
      setShowScrollBottom(shouldShow);
    }
  };

  const handleScroll = () => {
    if (suppressScrollRef.current) return;
    cancelAnimationFrame(scrollRafRef.current);

    scrollRafRef.current = requestAnimationFrame(() => {
      const scroller = scrollerRef.current;

      if (scroller) {
        const distance =
          scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
        userAtBottomRef.current = distance <= BOTTOM_THRESHOLD;
      }

      updateScrollBottomVisibility();
    });
  };

  useLayoutEffect(() => {
    suppressScrollRef.current = true;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        updateScrollBottomVisibility();
        suppressScrollRef.current = false;
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      cancelAnimationFrame(scrollRafRef.current);
      suppressScrollRef.current = false;
    };
  }, [timelineItems, updateScrollBottomVisibility]);

  const hasUserScrolledRef = useRef(false);

  const virtualKey = anchorId ?? "latest";

  useEffect(() => {
    updateScrollBottomVisibility();
  }, [anchorId, hasNextPage]);

  const handleScrollToBottom = () => {
    if (anchorId && hasNextPage) {
      setAnchorId(null);
      clearJump();
    } else {
      virtuosoRef.current?.scrollToIndex({
        index: "LAST",
        align: "end",
        behavior: "auto",
      });
    }
  };

  // virtualization
  const [followEnabled, setFollowEnabled] = useState(!anchorId);

  useEffect(() => {
    if (!anchorId) {
      // latest mode: always allow following
      setFollowEnabled(true);
      return;
    }
    if (hasNextPage) {
      // anchored, still walking forward: keep it off
      setFollowEnabled(false);
      return;
    }

    const id = requestAnimationFrame(() => setFollowEnabled(true));
    return () => cancelAnimationFrame(id);
  }, [anchorId, hasNextPage]);

  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);

  const scrollTopBeforeFetchRef = useRef<number | null>(null);

  const prevKeyRef = useRef(virtualKey);
  const isAtBottomRef = useRef(false);

  if (prevKeyRef.current !== virtualKey) {
    prevKeyRef.current = virtualKey;
    setFirstItemIndex(START_INDEX);
    hasUserScrolledRef.current = false;
    isAtBottomRef.current = false;
  }

  const handleAtBottomStateChange = (atBottom: boolean) => {
    if (!hasUserScrolledRef.current || !virtuosoRef.current) return;

    const wasAtBottom = isAtBottomRef.current;
    isAtBottomRef.current = atBottom;

    if (!atBottom) return; // rising edge only
    if (wasAtBottom) return;
    if (!anchorId) return; // anchored mode only
    if (isFetchingNextPage || !hasNextPage) return;

    virtuosoRef.current.getState((state) => {
      scrollTopBeforeFetchRef.current = state.scrollTop;
    });

    fetchNextPage();
  };

  useLayoutEffect(() => {
    const saved = scrollTopBeforeFetchRef.current;
    if (saved == null) return;
    scrollTopBeforeFetchRef.current = null;

    virtuosoRef.current?.scrollTo({ top: saved });
  }, [timelineItems]);

  // if we're anchored and the target item is already in the list, make Virtuoso centred on it, else start at the bottom.
  const anchorArrayIndex =
    anchorId && !isLoading
      ? timelineItems.findIndex(
          (item) =>
            item instanceof MessageItem && item.data.message.id === anchorId,
        )
      : -1;

  const initialTopMostItemIndex =
    anchorArrayIndex >= 0
      ? { index: anchorArrayIndex, align: "center" as const }
      : { index: "LAST" as const, align: "end" as const };

  // when older messages are loaded, shift the amount
  const firstStableIndex = timelineItems.findIndex(
    (item) => !(item instanceof DateSeparator),
  );
  const firstStableKey =
    firstStableIndex >= 0 ? timelineItems[firstStableIndex].getKey() : null;
  const prevStableRef = useRef({
    key: firstStableKey,
    index: firstStableIndex,
  });

  useLayoutEffect(() => {
    const prev = prevStableRef.current;

    if (prev.key && firstStableKey && prev.key !== firstStableKey) {
      const newIndexOfPrevStable = timelineItems.findIndex(
        (item) => item.getKey() === prev.key,
      );

      if (newIndexOfPrevStable !== -1) {
        const itemsAdded = newIndexOfPrevStable - prev.index;

        if (itemsAdded > 0) {
          setFirstItemIndex((curr: number) => curr - itemsAdded);
        }
      }
    }

    prevStableRef.current = { key: firstStableKey, index: firstStableIndex };
  }, [timelineItems, firstStableKey, firstStableIndex]);

  useEffect(() => {
    if (!jumpMessageId) return;

    const arrayIndex = timelineItems.findIndex(
      (item) =>
        item instanceof MessageItem && item.data.message.id === jumpMessageId,
    );

    // message already loaded, jump to it immediately
    if (arrayIndex >= 0 && virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index: arrayIndex,
        align: "center",
        behavior: "auto",
      });

      setHighlightedMessageId(jumpMessageId);
      clearJump();
      return;
    }

    // not loaded, set anchor to it
    if (anchorId !== jumpMessageId) {
      setAnchorId(jumpMessageId);
      return;
    }

    // if message isn't appear after anchor loading, it must be deleted or can't be accessed, return to latest
    if (!isLoading) {
      // around query resolved but message isn't there
      clearJump();
      setAnchorId(null);
    }
  }, [
    jumpMessageId,
    timelineItems,
    firstItemIndex,
    anchorId,
    clearJump,
    isLoading,
  ]);

  useEffect(() => {
    if (isLoading) return;
    if (!anchorId) return;
    if (!hasNextPage) return;
    if (isFetchingNextPage) return;

    const scroller = scrollerRef.current;
    if (!scroller) return;

    // +1 for sub-pixel rounding.
    if (scroller.scrollHeight > scroller.clientHeight + 1) return;

    fetchNextPage();
  }, [
    timelineItems,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    anchorId,
    fetchNextPage,
  ]);

  const fetchOlderMessages = async () => {
    if (isFetchingPreviousPage || !hasPreviousPage) return;
    await fetchPreviousPage();
  };

  // edit handling
  const handleSaveEdit = async (
    newBody: string | null,
    removeAttachmentIds: string[],
    addAttachments: File[],
  ) => {
    if (editingMessage === undefined) return;

    setEditingMessage(undefined);
    handleEditMessage(editingMessage.id, {
      body: newBody?.trim() ?? null,
      removeAttachmentIds,
      addAttachments,
    });
  };

  // shared emoji panel, one emoji standard popover instance for the whole chat view.
  const [emojiPanel, setEmojiPanelState] = useState<EmojiPanelRequest | null>(
    null,
  );
  const emojiPanelRequestRef = useRef<EmojiPanelRequest | null>(null);
  const emojiPanelTriggerRef = useRef<HTMLButtonElement | null>(null);
  const pendingEmojiOpenRef = useRef<{
    rafId: number;
    request: EmojiPanelRequest;
  } | null>(null);

  const setEmojiPanel = (next: EmojiPanelRequest | null) => {
    const prev = emojiPanelRequestRef.current;
    if (prev && prev !== next) prev.onOpenChange?.(false);

    emojiPanelRequestRef.current = next;
    setEmojiPanelState(next);
  };

  const handleEmojiPanelOpen = (
    anchor: HTMLElement,
    side: EmojiPanelSide,
    onSelect: (emoji: SelectedEmoji) => void,
    onOpenChange?: (open: boolean) => void,
  ) => {
    const request: EmojiPanelRequest = {
      getRect: createRectGetter(anchor),
      side,
      onSelect,
      onOpenChange,
    };

    const pending = pendingEmojiOpenRef.current;
    if (pending) {
      cancelAnimationFrame(pending.rafId);
      pending.request.onOpenChange?.(false);
      pendingEmojiOpenRef.current = null;
    }

    const rafId = requestAnimationFrame(() => {
      pendingEmojiOpenRef.current = null;
      setEmojiPanel(request);
    });
    pendingEmojiOpenRef.current = { rafId, request };
  };

  useEffect(() => {
    return () => {
      const pending = pendingEmojiOpenRef.current;
      if (pending) cancelAnimationFrame(pending.rafId);
    };
  }, []);

  // keep the emoji panel glue to the trigger when resize or scroll
  useEffect(() => {
    if (!emojiPanel) return;

    const updateTriggerPosition = () => {
      const trigger = emojiPanelTriggerRef.current;
      if (!trigger) return;

      const rect = emojiPanel.getRect();
      trigger.style.left = `${rect.left}px`;
      trigger.style.top = `${rect.top}px`;
      trigger.style.width = `${rect.width}px`;
      trigger.style.height = `${rect.height}px`;
    };

    updateTriggerPosition();

    window.addEventListener("scroll", updateTriggerPosition, true);
    window.addEventListener("resize", updateTriggerPosition);

    return () => {
      window.removeEventListener("scroll", updateTriggerPosition, true);
      window.removeEventListener("resize", updateTriggerPosition);
    };
  }, [emojiPanel]);

  const emojiPanelRect = emojiPanel?.getRect();

  // signalr events
  useSignalREvent("MessageReceived", async (event: MessageReceivedEvent) => {
    if (event.message.conversationId !== conversationId) return;

    appendMessage(event.message);
  });

  useSignalREvent("MessageEdited", async (event: MessageEditedEvent) => {
    updateMessage(event.messageId, event.message);
  });

  useSignalREvent("MessageDeleted", async (event: MessageDeletedEvent) => {
    deleteMessage(event.messageId);
  });

  useSignalREvent(
    "ReactionsCountsSynchronized",
    async (event: ReactionsCountsSynchronizedEvent) => {
      if (event.conversationId !== conversationId) return;

      for (const message of event.messages) {
        updateReactionsCounts(message.messageId, message.reactionsCounts);
      }
    },
  );

  useSignalREvent(
    "ReactionsActionsSynchronized",
    async (event: ReactionsActionsSynchronizedEvent) => {
      for (const actions of event.actions) {
        updateUserReactionKeys(
          actions.messageId,
          (prev: string[]): string[] => {
            let updatedKeys: string[] = [...prev];

            for (const [reactionKey, action] of Object.entries(
              actions.reactionActions,
            )) {
              if (action === ReactionAction.Add) {
                if (!updatedKeys.includes(reactionKey)) {
                  updatedKeys.push(reactionKey);
                } else {
                  updatedKeys = updatedKeys.filter((k) => k !== reactionKey);
                }
              }
            }

            return updatedKeys;
          },
        );
      }
    },
  );

  const timelineContext: TimelineContext = {
    actions: {
      onMessageDeleteTrigger: setDeletingMessage,
      onMessageEditTrigger: (message: TimelineMessageDto) => {
        setEditingMessage(message);
      },
      onMessageReplyTrigger: setReplyingMessage,
      onEditCancel: () => {
        setEditingMessage(undefined);
      },
      onAttachmentClick: (
        messageAttachments: MessageAttachmentDto[],
        clickedIndex: number,
      ) => {
        setMediaElements(
          messageAttachments.map((attachment) => ({
            id: attachment.id,
            src: conversationService.getAttachmentViewUrl(attachment.id),
            fileName: attachment.fileName,
            mediaType: attachment.contentType,
          })),
          clickedIndex,
          {
            downloadUrlProvider: (attachmentIndex: number) =>
              conversationService.getAttachmentDownloadUrl(
                messageAttachments[attachmentIndex].id,
              ),
          },
        );
      },

      removeSendingOperation: removeSendOperation,
      retrySendingOperation: retrySendOperation,
      retryEditOperation,
      removeEditOperation,
      updateMessagePin: (messageId: string, isPinned: boolean) =>
        updatePinStatus(messageId, isPinned),

      onEmojiPanelOpen: handleEmojiPanelOpen,
    },
    states: {
      // editingMessageDraft: editingMessageDraft,
      highlightedMessageId,
      allowEditMessage,
      allowDeleteMessage,
    },
  };

  // hacky way to make the top loader not disappear instantly when older messages are loaded
  const pendingOlderHideRef = useRef(false);
  const topLoaderRef = useRef<HTMLDivElement>(null);

  const showTopLoader = () => {
    const topLoader = topLoaderRef.current;
    if (!topLoader) return;
    topLoader.classList.remove("opacity-0", "-translate-y-2");
    topLoader.classList.add("opacity-100", "translate-y-0");
  };

  const hideTopLoader = () => {
    const topLoader = topLoaderRef.current;
    if (!topLoader) return;
    topLoader.classList.add("opacity-0", "-translate-y-2");
    topLoader.classList.remove("opacity-100", "translate-y-0");
  };

  useEffect(() => {
    if (isFetchingPreviousPage) showTopLoader();
  }, [isFetchingPreviousPage]);

  useLayoutEffect(() => {
    if (isFetchingPreviousPage) return; // still loading
    if (!pendingOlderHideRef.current) return; // nothing to hide
    pendingOlderHideRef.current = false;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(hideTopLoader);
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [isFetchingPreviousPage, messagePages]);

  useEffect(() => {
    if (isFetchingPreviousPage) {
      pendingOlderHideRef.current = true;
    }
  }, [isFetchingPreviousPage]);

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-gray-700 text-white">
      {isLoading ? (
        <div className="mb-2 min-h-0 flex-1 overflow-hidden">
          <div className="space-y-1">
            {Array.from({ length: 20 }, (_, index) => (
              <div key={index} className="px-2">
                <MessageRow.HeaderSkeleton>
                  <MessageRow.BodySkeleton />
                </MessageRow.HeaderSkeleton>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative min-h-0 flex-1">
          <div
            ref={topLoaderRef}
            className="bg-gray-750 pointer-events-none absolute top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-2 rounded-md p-2 opacity-0 transition-all duration-200 ease-out"
          >
            <Spinner className="size-6 fill-white" />
          </div>

          <div
            className={`bg-gray-750 pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-md p-2 transition-all duration-200 ease-out ${
              isFetchingNextPage
                ? "translate-y-0 opacity-100"
                : "translate-y-2 opacity-0"
            }`}
          >
            <Spinner className="size-6 fill-white" />
          </div>

          <Virtuoso
            ref={virtuosoRef}
            key={virtualKey} // so that initialTopMostItemIndex is re-evaluated
            data={timelineItems}
            computeItemKey={(_, item) => item.getKey()}
            atBottomThreshold={BOTTOM_THRESHOLD}
            followOutput={
              !anchorId || (followEnabled && !hasNextPage)
                ? (isAtBottom) => (isAtBottom ? "auto" : false)
                : false
            }
            alignToBottom={!anchorId}
            initialTopMostItemIndex={initialTopMostItemIndex}
            firstItemIndex={firstItemIndex}
            startReached={fetchOlderMessages}
            atBottomStateChange={handleAtBottomStateChange}
            isScrolling={(scrolling) => {
              if (scrolling && !hasUserScrolledRef.current) {
                hasUserScrolledRef.current = true;
              }
            }}
            // totalListHeightChanged={handleTotalListHeightChanged}
            overscan={10}
            className="h-full"
            scrollerRef={(ref) => {
              if (ref instanceof HTMLDivElement) scrollerRef.current = ref;
            }}
            onScroll={handleScroll}
            itemContent={(_index, timelineItem) =>
              timelineItem.render(timelineContext)
            }
            components={{
              EmptyPlaceholder: () => (
                <div className="flex size-full flex-row items-end justify-center select-none">
                  <p className="text-gray-400 text-sm text-center">There is nothing here... There was nothing here... Would you start something here?</p>
                </div>
              ),
            }}
          />

          <IconButton
            theme="default"
            className={`bg-gray-750 absolute right-2 bottom-2 z-10 rounded-md p-2 transition-all duration-200 ease-out ${
              showScrollBottom
                ? "pointer-events-auto translate-y-0 opacity-100"
                : "pointer-events-none translate-y-2 opacity-0"
            }`}
            onClick={handleScrollToBottom}
          >
            <FaArrowDown className="size-6" />
          </IconButton>
        </div>
      )}

      <EditMessageModal
        open={!!editingMessage}
        onOpenChange={(open) => {
          if (!open) {
            setEditingMessage(undefined);
          }
        }}
        key={editingMessage?.id}
        originalMessage={editingMessage}
        handleSubmit={(
          newBody: string | null,
          removeAttachmentIds: string[],
          newAttachments: File[],
        ) => {
          handleSaveEdit(newBody, removeAttachmentIds, newAttachments);
        }}
      />

      <DeleteMessageConfirmationDialog
        open={!!deletingMessage}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingMessage(undefined);
          }
        }}
        onConfirm={() => {
          if (deletingMessage) {
            handleDeleteMessage(deletingMessage.id);
            setDeletingMessage(undefined);
          }
        }}
      />

      <EmojiPanel.StandardPopover
        open={!!emojiPanel}
        side={emojiPanel?.side ?? "right"}
        contentClassName="emoji-standard-panel"
        trigger={
          <button
            ref={emojiPanelTriggerRef}
            type="button"
            aria-hidden
            tabIndex={-1}
            style={{
              position: "fixed",
              left: emojiPanelRect?.left ?? 0,
              top: emojiPanelRect?.top ?? 0,
              width: emojiPanelRect?.width ?? 0,
              height: emojiPanelRect?.height ?? 0,
              pointerEvents: "none",
              visibility: "hidden",
            }}
          />
        }
        onSelect={(emoji) => emojiPanel?.onSelect(emoji)}
        onOpenChange={(open) => {
          if (!open) setEmojiPanel(null);
        }}
        disableFocusOutsideClose
      />
    </div>
  );
}
