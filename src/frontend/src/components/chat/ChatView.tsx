import type {
  AttachmentDto,
  TimelineMessageDto,
} from "../../api/types.ts";
import {useLayoutEffect, useRef, useState} from "react";
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
import Dialog from "../Dialog.tsx";
import {Dialog as RadixDialog} from "radix-ui";
import {Virtuoso} from "react-virtuoso";
import {BsTrashFill} from "react-icons/bs";
import Spinner from "../Spinner.tsx";
import {useAuth} from "../../contexts/AuthContext.tsx";
import useTypingIndicator from "../../hooks/useTypingIndicator.ts";
import TypingIndicator from "./TypingIndicator.tsx";
import useTimelineMessages from "../../hooks/useTimelineMessages.ts";

const START_INDEX = 10000000;

type MediaGalleryState = {
  items: { id: string; type: string }[];
  currentIndex: number;
};

export interface ChatViewProps {}

export function ChatView({}: ChatViewProps) {
  const {
    handleEditMessage,
    handleDeleteMessage,
    setReplyingMessage,
    removeSendOperation,
    retrySendOperation,
    retryEditOperation,
    removeEditOperation,
    conversationId,
  } = useChatContainerContext();

  const {
    queryResult: {
      isFetchingPreviousPage, hasPreviousPage, fetchPreviousPage,
      isFetchingNextPage, hasNextPage, fetchNextPage,
      isLoading,
    },
    appendMessage,
    updateMessage,
    deleteMessage,
  } = useTimelineMessages(conversationId);

  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);

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

  const handleAttachmentClick = (messageAttachments: AttachmentDto[], clickedIndex: number) => {
    setGalleryState({
      items: messageAttachments.map(att => ({id: att.id, type: att.type})),
      currentIndex: clickedIndex
    });
  };

  // message editing
  const [editingMessage, setEditingMessage] = useState<TimelineMessageDto | undefined>(undefined);
  const [editingMessageDraft, setEditingMessageDraft] = useState<string | null>(null);

  const handleSaveEdit = async (newBody: string | null) => {
    if (editingMessage === undefined) return;

    setEditingMessage(undefined);
    setEditingMessageDraft(null);

    handleEditMessage(editingMessage, newBody?.trim() ?? null);
  };

  const [deletingMessage, setDeletingMessage] = useState<TimelineMessageDto | undefined>(undefined);

  // pinning

  // timeline entries
  const timelineItems = useTimelineItems(editingMessage?.id ?? undefined);
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
  const firstStableIndex = timelineItems.findIndex(item => {
    const key = item.getKey();
    return !key.includes('date');
  });
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

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center overflow-hidden h-full text-white bg-gray-700">
        <Spinner className="size-10 fill-white"/>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full text-white bg-gray-700">
      {isLoading ? (
        <div className="size-full flex flex-row justify-center items-center">
          <Spinner className="size-10 fill-white"/>
        </div>
      ) : (
        <Virtuoso
          data={timelineItems}
          computeItemKey={(_index, item) => item.getKey()}
          atBottomThreshold={60}
          followOutput={(isAtBottom) => isAtBottom ? 'smooth' : false}
          alignToBottom={true}
          initialTopMostItemIndex={{ index: "LAST", align: "end" }}
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

function DeleteMessageConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
}: { open: boolean, onOpenChange: (open: boolean) => void, onConfirm: () => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      headerIcon={<BsTrashFill className="size-10 fill-white"/>}
      title="Delete Message"
      subtitle="Nothing happened here, folk..."
      contentClassName="centered-dialog w-128 rounded-xl text-white bg-gray-650 outline-none"
      footerContent={(
        <div className="w-full flex flex-row justify-end p-3 gap-3">
          <RadixDialog.Close
            type="button"
            className="cursor-pointer basis-20 outline-none"
          >
            Cancel
          </RadixDialog.Close>

          <button
            className="button-theme-danger cursor-pointer px-3 py-2 rounded-md"
            onClick={onConfirm}
          >
            Delete message
          </button>
        </div>
      )}
    >
      <div className="p-3">
        Are you sure you want to delete this message?<br/>
        This action cannot be undone. You will never see this message and its attachments ever again.
      </div>
    </Dialog>
  )
}