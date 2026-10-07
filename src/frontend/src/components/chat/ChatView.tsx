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

const START_INDEX = 10000000;

type MediaGalleryState = {
  items: { id: string; type: string }[];
  currentIndex: number;
};

export interface ChatViewProps {}

export function ChatView({}: ChatViewProps) {
  const virtuosoRef = useRef<VirtuosoHandle | null>(null);

  const [editingMessage, setEditingMessage] = useState<TimelineMessageDto | undefined>(undefined);
  const [editingMessageDraft, setEditingMessageDraft] = useState<string | null>(null);

  const [deletingMessage, setDeletingMessage] = useState<TimelineMessageDto | undefined>(undefined);

  const handleAttachmentClick = (messageAttachments: AttachmentDto[], clickedIndex: number) => {
    setGalleryState({
      items: messageAttachments.map(att => ({id: att.id, type: att.type})),
      currentIndex: clickedIndex
    });
  };

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
    isFetchingPreviousPage, hasPreviousPage, fetchPreviousPage,
    isFetchingNextPage, hasNextPage, fetchNextPage,
    isLoading,
  } = useTimelineMessagesQuery(conversationId, anchorId);

  const { appendMessage, updateMessage, deleteMessage } = useTimelineMessageMutations(conversationId);

  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);

  // timeline entries
  const timelineItems = useTimelineItems(messagePages, editingMessage?.id ?? undefined);
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

  // logic to calculate the jump when older messages are loaded
  const firstStableIndex = timelineItems.findIndex(item => !item.getKey().includes('date'));
  const firstStableKey = firstStableIndex >= 0 ? timelineItems[firstStableIndex].getKey() : null;
  const prevStableRef = useRef({ key: firstStableKey, index: firstStableIndex });

  useEffect(() => {
    setFirstItemIndex(START_INDEX);
    prevStableRef.current = { key: null, index: -1 };
  }, [conversationId, anchorId]);

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

    if (arrayIndex === -1) {
      // message hasn't been loaded in memory
      if (anchorId !== jumpMessageId) {
        setAnchorId(jumpMessageId);
      } else if (!isLoading) {
        // if query finished, but message still isn't there, probably deleted or inaccessible.
        clearJump();
      }

      return;
    }

    if (!virtuosoRef.current) return;

    virtuosoRef.current.scrollToIndex({
      index: arrayIndex,
      align: "center",
      behavior: "auto",
    });

    clearJump();
  }, [jumpMessageId, timelineItems, firstItemIndex, anchorId, clearJump, isLoading]);

  const fetchOlderMessages = async () => {
    if (isFetchingPreviousPage || !hasPreviousPage) return;
    await fetchPreviousPage();
  }

  const fetchNewerMessages = async () => {
    if (isFetchingNextPage || !hasNextPage) return;
    await fetchNextPage();
  };

  // gallery
  const [galleryState, setGalleryState] = useState<MediaGalleryState>({
    items: [],
    currentIndex: 0,
  });

  const handleSaveEdit = async (newBody: string | null) => {
    if (editingMessage === undefined) return;

    setEditingMessage(undefined);
    setEditingMessageDraft(null);

    handleEditMessage(editingMessage, newBody?.trim() ?? null);
  };

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full text-white bg-gray-700">
      {isLoading ? (
        <div className="space-y-1">
          {[...new Array(20).keys()].map((_, index) => (
            <div key={index} className="px-2">
              <MessageRow.HeaderSkeleton>
                <MessageRow.BodySkeleton/>
              </MessageRow.HeaderSkeleton>
            </div>
          ))}
        </div>
      ) : (
        <Virtuoso
          ref={virtuosoRef}
          data={timelineItems}
          computeItemKey={(_index, item) => item.getKey()}
          atBottomThreshold={60}
          followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
          alignToBottom={!anchorId}
          initialTopMostItemIndex={anchorId ? undefined : { index: "LAST", align: "end" }}
          firstItemIndex={firstItemIndex}
          startReached={fetchOlderMessages}
          endReached={fetchNewerMessages}
          overscan={10}
          className="flex-1 min-h-0 mb-2"
          components={{
            Header: () => (
              isFetchingPreviousPage ? (
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                  Loading older messages...
                </div>
              ) : null
            ),
            Footer: () => (
              isFetchingNextPage ? (
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                  Loading newer messages...
                </div>
              ) : null
            )
          }}
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