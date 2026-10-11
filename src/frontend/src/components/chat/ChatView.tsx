import type {
  AttachmentDto,
  TimelineMessageDto,
} from "../../api/types.ts";
import {useEffect, useLayoutEffect, useRef, useState} from "react";
import {conversationService} from "../../api/conversationService.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {
  MessageDeletedEvent,
  MessageEditedEvent,
  MessageReceivedEvent
} from "../../api/events.ts";
import {useChatContainerContext} from "../../contexts/ChatContainerContext.tsx";
import useTimelineItems from "../../hooks/useTimelineItems.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import {Virtuoso, type VirtuosoHandle} from "react-virtuoso";
import {useAuth} from "../../contexts/AuthContext.tsx";
import useTypingIndicator from "../../hooks/useTypingIndicator.ts";
import TypingIndicator from "./TypingIndicator.tsx";
import useTimelineMessagesQuery from "../../hooks/useTimelineMessagesQuery.ts";
import {MessageRow} from "./MessageRow.tsx";
import {MessageItem} from "./MessageItem.tsx";
import DeleteMessageConfirmationDialog from "./DeleteMessageConfirmationDialog.tsx";
import useTimelineMessageMutations from "../../hooks/useTimelineMessageMutations.ts";
import {DateSeparator} from "./DateSeparator.tsx";
import {useMediaGalleryStore} from "../../store/useMediaGalleryStore.ts";
import Spinner from "../Spinner.tsx";
import {FaArrowDown} from "react-icons/fa6";
import IconButton from "../IconButton.tsx";

const LATEST_BUTTON_THRESHOLD = 2000;
const START_INDEX = 100_000_000;
const BOTTOM_THRESHOLD = 150;

interface ChatViewProps {
  allowDeleteMessage?: boolean;
  allowEditMessage?: boolean;
}

export function ChatView({
  allowEditMessage = true,
  allowDeleteMessage = true,
}: ChatViewProps) {
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
  } = useTimelineMessagesQuery(conversationId, anchorId);

  const { appendMessage, updateMessage, deleteMessage } = useTimelineMessageMutations(conversationId);

  const virtuosoRef = useRef<VirtuosoHandle | null>(null);

  const [editingMessage, setEditingMessage] = useState<TimelineMessageDto | undefined>(undefined);
  const [editingMessageDraft, setEditingMessageDraft] = useState<string | null>(null);
  const prevAllowEditRef = useRef(allowEditMessage);

  useEffect(() => {
    if (prevAllowEditRef.current && !allowEditMessage) {
      setEditingMessage(undefined);
      setEditingMessageDraft(null);
    }

    prevAllowEditRef.current = allowEditMessage;
  }, [allowEditMessage]);
  
  const [deletingMessage, setDeletingMessage] = useState<TimelineMessageDto | undefined>(undefined);
  const prevAllowDeleteRef = useRef(allowDeleteMessage);
  
  useEffect(() => {
    if (prevAllowDeleteRef.current && !allowDeleteMessage) {
      setDeletingMessage(undefined);
    }
    
    prevAllowDeleteRef.current = allowDeleteMessage;
  }, [allowDeleteMessage]);

  const timelineItems = useTimelineItems(messagePages, editingMessage?.id ?? undefined);

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const showScrollBottomRef = useRef(false);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollRafRef = useRef(0);
  const suppressScrollRef = useRef(false);

  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  const userAtBottomRef = useRef(true);
  const prevListHeightRef = useRef(0);

  useEffect(() => {
    if (!highlightedMessageId) return;

    const t = setTimeout(() => setHighlightedMessageId(null), 1500);
    return () => clearTimeout(t);
  }, [highlightedMessageId]);

  const updateScrollBottomVisibility = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    const anchorViewNotLatest = !!anchorId && hasNextPage;

    const shouldShow = distance >= LATEST_BUTTON_THRESHOLD || anchorViewNotLatest;

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
        console.log(scroller.scrollHeight, scroller.clientHeight)
        
        const distance = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
        userAtBottomRef.current = distance <= BOTTOM_THRESHOLD;
      }

      updateScrollBottomVisibility();
    });
  };

  const handleTotalListHeightChanged = (height: number) => {
    const prev = prevListHeightRef.current;
    prevListHeightRef.current = height;

    if (height <= prev) return;
    if (!userAtBottomRef.current) return;

    virtuosoRef.current?.scrollToIndex({
      index: "LAST",
      align: "end",
      behavior: "auto",
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
        behavior: "auto"
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

    if (!atBottom) return;              // rising edge only
    if (wasAtBottom) return;
    if (!anchorId) return;              // anchored mode only
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
  const anchorArrayIndex = anchorId && !isLoading ? timelineItems.findIndex(
    item => item instanceof MessageItem && item.data.message.id === anchorId,
  ) : -1;

  const initialTopMostItemIndex = anchorArrayIndex >= 0 ?
    { index: anchorArrayIndex, align: "center" as const } :
    { index: "LAST" as const, align: "end" as const };

  // when older messages are loaded, shift the amount
  const firstStableIndex = timelineItems.findIndex(item => !(item instanceof DateSeparator));
  const firstStableKey = firstStableIndex >= 0 ? timelineItems[firstStableIndex].getKey() : null;
  const prevStableRef = useRef({ key: firstStableKey, index: firstStableIndex });

  useLayoutEffect(() => {
    const prev = prevStableRef.current;

    if (prev.key && firstStableKey && prev.key !== firstStableKey) {
      const newIndexOfPrevStable = timelineItems.findIndex(item => item.getKey() === prev.key);

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

    const arrayIndex = timelineItems.findIndex(item =>
      item instanceof MessageItem && item.data.message.id === jumpMessageId
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
  }, [jumpMessageId, timelineItems, firstItemIndex, anchorId, clearJump, isLoading]);

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
  }, [timelineItems, hasNextPage, isFetchingNextPage, isLoading, anchorId, fetchNextPage]);

  const fetchOlderMessages = async () => {
    if (isFetchingPreviousPage || !hasPreviousPage) return;
    await fetchPreviousPage();
  }

  // edit handling
  const handleSaveEdit = async (newBody: string | null) => {
    if (editingMessage === undefined) return;

    setEditingMessage(undefined);
    setEditingMessageDraft(null);

    handleEditMessage(editingMessage, newBody?.trim() ?? null);
  };

  // typing indicator
  const { userProfile } = useAuth();
  const { typingUsers } = useTypingIndicator(userProfile?.id ?? "");

  // signalr events
  useSignalREvent("MessageReceived", async (event: MessageReceivedEvent) => {
    if (event.message.conversationId !== conversationId) return;

    appendMessage(event.message);
  });

  useSignalREvent("MessageEdited", async (event: MessageEditedEvent) => {
    updateMessage(event.message.id, { body: event.message.newBody });
  });

  useSignalREvent("MessageDeleted", async (event: MessageDeletedEvent) => {
    deleteMessage(event.messageId);
  });

  const timelineContext: TimelineContext = {
    actions: {
      onMessageDeleteTrigger: setDeletingMessage,
      onMessageEditTrigger: setEditingMessage,
      onMessageReplyTrigger: setReplyingMessage,
      onEditDraftChange: (body: string | null) => setEditingMessageDraft(body),
      onEditCancel: () => {
        setEditingMessage(undefined);
        setEditingMessageDraft(null);
      },
      onEditSaved: (newBody) => handleSaveEdit(newBody),
      onAttachmentClick: (messageAttachments: AttachmentDto[], clickedIndex: number) => {
        setMediaElements(messageAttachments.map(attachment => ({
          id: attachment.id,
          src: conversationService.getAttachmentUrl(attachment.id, false),
          fileName: attachment.name,
          mediaType: attachment.type,
        })), clickedIndex, {
          downloadUrlProvider: (attachmentIndex: number) => conversationService.getAttachmentDownloadUrl(messageAttachments[attachmentIndex].id),
        });
      },

      removeSendingOperation: removeSendOperation,
      retrySendingOperation: retrySendOperation,
      retryEditOperation,
      removeEditOperation,
      updateMessagePin: (messageId: string, isPinned: boolean) => updateMessage(messageId, { isPinned }),
    },
    states: {
      editingMessageDraft: editingMessageDraft,
      highlightedMessageId,
      allowEditMessage,
      allowDeleteMessage,
    }
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
    if (isFetchingPreviousPage) return;        // still loading
    if (!pendingOlderHideRef.current) return;  // nothing to hide
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
    <div className="flex-1 flex flex-col overflow-hidden h-full text-white bg-gray-700">
      {isLoading ? (
        <div className="flex-1 min-h-0 mb-2 overflow-hidden">
          <div className="space-y-1">
            {[...new Array(20).keys()].map((_, index) => (
              <div key={index} className="px-2">
                <MessageRow.HeaderSkeleton>
                  <MessageRow.BodySkeleton/>
                </MessageRow.HeaderSkeleton>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative flex-1 min-h-0 mb-2">
          <div
            ref={topLoaderRef}
            className="pointer-events-none z-10 absolute top-2 left-1/2 -translate-x-1/2 bg-gray-750 p-2 rounded-md transition-all duration-200 ease-out opacity-0 -translate-y-2"
          >
            <Spinner className="size-6 fill-white" />
          </div>

          <div className={`pointer-events-none z-10 absolute bottom-2 left-1/2 -translate-x-1/2 bg-gray-750 p-2 rounded-md transition-all duration-200 ease-out ${
            isFetchingNextPage ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}>
            <Spinner className="size-6 fill-white"/>
          </div>

          <Virtuoso
            ref={virtuosoRef}
            key={virtualKey}  // so that initialTopMostItemIndex is re-evaluated
            data={timelineItems}
            computeItemKey={(_, item) => item.getKey()}
            atBottomThreshold={BOTTOM_THRESHOLD}
            followOutput={
              !anchorId || (followEnabled && !hasNextPage) ?
                (isAtBottom) => (isAtBottom ? "auto" : false) :
                false
            }
            alignToBottom={!anchorId}
            initialTopMostItemIndex={initialTopMostItemIndex}
            firstItemIndex={firstItemIndex}
            startReached={fetchOlderMessages}
            atBottomStateChange={handleAtBottomStateChange}
            isScrolling={(scrolling) => {
              console.log(`isScrolling(${scrolling})`, hasUserScrolledRef.current);

              if (scrolling && !hasUserScrolledRef.current) {
                console.log("hasUserScrolledRef.current to true");
                hasUserScrolledRef.current = true;
              }
            }}
            totalListHeightChanged={handleTotalListHeightChanged}
            overscan={10}
            className="h-full"
            scrollerRef={(ref) => {
              if (ref instanceof HTMLDivElement) scrollerRef.current = ref;
            }}
            onScroll={handleScroll}
            itemContent={(_index, timelineItem) => timelineItem.render(timelineContext)}
          />

          <IconButton
            theme="default"
            className={`z-10 absolute bottom-2 right-2 bg-gray-750 p-2 rounded-md transition-all duration-200 ease-out ${
              showScrollBottom ? "pointer-events-auto opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-2"
            }`}
            onClick={handleScrollToBottom}
          >
            <FaArrowDown className="size-6"/>
          </IconButton>
        </div>
      )}

      <TypingIndicator displayUsers={typingUsers.slice(0, 4)}/>

      <DeleteMessageConfirmationDialog
        open={!!deletingMessage}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingMessage(undefined);
          }
        }}
        onConfirm={() => {
          if (deletingMessage) {
            handleDeleteMessage(deletingMessage);
            setDeletingMessage(undefined);
          }
        }}
      />
    </div>
  );
}