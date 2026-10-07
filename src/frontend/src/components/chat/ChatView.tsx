import type {
  AttachmentDto,
  TimelineMessageDto,
} from "../../api/types.ts";
import {useEffect, useLayoutEffect, useRef, useState} from "react";
import MediaPreviewGallery from "../MediaPreviewGallery.tsx";
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

const START_INDEX = 100_000_000;

type MediaGalleryState = {
  items: { id: string; type: string }[];
  currentIndex: number;
};

export interface ChatViewProps {}

export function ChatView({}: ChatViewProps) {
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);

  // local states
  const [editingMessage, setEditingMessage] = useState<TimelineMessageDto | undefined>(undefined);
  const [editingMessageDraft, setEditingMessageDraft] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState<TimelineMessageDto | undefined>(undefined);

  // TODO: move to zustand state
  const [galleryState, setGalleryState] = useState<MediaGalleryState>({
    items: [],
    currentIndex: 0,
  });

  const handleAttachmentClick = (messageAttachments: AttachmentDto[], clickedIndex: number) => {
    setGalleryState({
      items: messageAttachments.map(att => ({id: att.id, type: att.type})),
      currentIndex: clickedIndex
    });
  };

  // messaging context and stuffs

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

  // if null, follow latest message, else around a message
  const [anchorId, setAnchorId] = useState<string | null>(null);

  const hasUserScrolledRef = useRef(false);

  const virtualKey = anchorId ?? "latest";

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

    // Anchored and caught up to the live edge. Defer enabling by one frame so
    // the scrollTop restore + Virtuoso's at-bottom recomputation settle first.
    // Enabling on the same commit that hasNextPage flips is what causes the
    // teleport: Virtuoso evaluates followOutput with a stale isAtBottom=true.
    const id = requestAnimationFrame(() => setFollowEnabled(true));
    return () => cancelAnimationFrame(id);
  }, [anchorId, hasNextPage]);

  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);

  const prevKeyRef = useRef(virtualKey);
  if (prevKeyRef.current !== virtualKey) {
    prevKeyRef.current = virtualKey;
    setFirstItemIndex(START_INDEX);
    hasUserScrolledRef.current = false;
  }

  const timelineItems = useTimelineItems(messagePages, editingMessage?.id ?? undefined);

  const isAtBottomRef = useRef(true);
  const scrollTopBeforeFetchRef = useRef<number | null>(null);

  const handleAtBottomStateChange = (atBottom: boolean) => {
    const wasAtBottom = isAtBottomRef.current;
    isAtBottomRef.current = atBottom;

    if (isFetchingNextPage || !hasNextPage) return;
    if (!atBottom || wasAtBottom) return;
    if (!hasUserScrolledRef.current) return;

    if (anchorId && virtuosoRef.current) {
      virtuosoRef.current.getState((state) => {
        console.log("save scrolltop", state.scrollTop);
        scrollTopBeforeFetchRef.current = state.scrollTop;
      });
    }

    console.log('fetch next page')
    fetchNextPage().then(() => {
      console.log("finish fetch next page");
    });
  };

  useLayoutEffect(() => {
    const saved = scrollTopBeforeFetchRef.current;
    if (saved == null) return;
    scrollTopBeforeFetchRef.current = null;

    console.log("reapply scrollto top", saved);
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
          setFirstItemIndex(curr => curr - itemsAdded);
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
    if (event.message.conversationId !== conversationId) return;

    updateMessage(event.message.id, { body: event.message.body });
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
      onAttachmentClick: handleAttachmentClick,

      removeSendingOperation: removeSendOperation,
      retrySendingOperation: retrySendOperation,
      retryEditOperation,
      removeEditOperation,
      updateMessagePin: (messageId: string, isPinned: boolean) => updateMessage(messageId, { isPinned }),
    },
    states: {
      editingMessageDraft: editingMessageDraft,
    }
  };

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
        <Virtuoso
          ref={virtuosoRef}
          key={virtualKey}  // so that initialTopMostItemIndex is re-evaluated
          data={timelineItems}
          computeItemKey={(_, item) => item.getKey()}
          atBottomThreshold={40}
          followOutput={
            !anchorId || (followEnabled && !hasNextPage) ?
              (isAtBottom) => { console.log("is at bottom:", isAtBottom); return (isAtBottom ? "auto" : false); } :
              false
          }
          alignToBottom={!anchorId}
          initialTopMostItemIndex={initialTopMostItemIndex}
          firstItemIndex={firstItemIndex}
          startReached={fetchOlderMessages}
          atBottomStateChange={handleAtBottomStateChange}
          // endReached={fetchNewerMessages}
          isScrolling={(scrolling) => {
            if (scrolling && !hasUserScrolledRef.current) {
              hasUserScrolledRef.current = true;
            }
          }}
          overscan={10}
          className="flex-1 min-h-0 mb-2"
          // components={{
          //   Header: () => (
          //     isFetchingPreviousPage ? (
          //       <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
          //         Loading older messages...
          //       </div>
          //     ) : null
          //   ),
          //   Footer: () => (
          //     isFetchingNextPage ? (
          //       <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
          //         Loading newer messages...
          //       </div>
          //     ) : null
          //   )
          // }}
          itemContent={(_index, timelineItem) => timelineItem.render(timelineContext)}
        />
      )}

      <TypingIndicator displayUsers={typingUsers.slice(0, 4)}/>

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
            source: conversationService.getAttachmentUrl(galleryState.items[galleryState.currentIndex].id, false),
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
          onDownloadRequested={() => {
            const downloadUrl = conversationService.getAttachmentDownloadUrl(galleryState.items[galleryState.currentIndex].id);

            const link = document.createElement("a");
            link.href = downloadUrl.toString();
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
        />
      )}

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