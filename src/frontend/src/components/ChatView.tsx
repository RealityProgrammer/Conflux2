import type {
  Attachment,
  TimelineMessageDto,
  UserIdentityProfileDto
} from "../api/types.ts";
import {useState} from "react";
import MediaPreviewGallery from "./MediaPreviewGallery.tsx";
import {messageService} from "../api/messageService.ts";
import {useQueryClient} from "@tanstack/react-query";
import useSignalREvent from "../hooks/useSignalREvent.ts";
import type {MessageDeletedEvent, MessageEditedEvent, MessageReceivedEvent} from "../api/events.ts";
import {useChatContainerContext} from "../contexts/ChatContainerContext.tsx";
import useTimelineEntries from "../hooks/useTimelineEntries.ts";
import type {TimelineContext} from "./chat/TimelineContext.ts";
import {useGetUserIdentityProfileQuery} from "../graphql/queries.ts";
import Dialog from "./Dialog.tsx";
import {Dialog as RadixDialog} from "radix-ui";
import {Virtuoso} from "react-virtuoso";

const START_INDEX = 10000000;

type MediaGalleryState = {
  items: { id: string; type: string }[];
  currentIndex: number;
};

export interface QueryModification {
  appendMessage: (message: TimelineMessageDto, userProfile?: UserIdentityProfileDto) => void;
  editMessage: (messageId: string, newBody: string | null) => void;
  deleteMessage: (messageId: string) => void;
}

export interface ChatViewProps {}

export function ChatView({}: ChatViewProps) {
  const {
    messageQueryResult,
    messageClusters,
    userProfiles,
    appendMessage,
    editMessage,
    deleteMessage,
    onMessageEdit,
    onMessageDelete,
    setReplyingMessage
  } = useChatContainerContext()!;

  const queryClient = useQueryClient();

  const [firstItemIndex, setFirstItemIndex] = useState(START_INDEX);

  const fetchOlderMessages = async () => {
    if (messageQueryResult.isFetchingPreviousPage || !messageQueryResult.hasPreviousPage) return;

    const { data } = await messageQueryResult.fetchPreviousPage();

    if (data && data.pages.length > 0) {
      const newlyPrependedPage = data.pages[0];

      const itemsAdded = newlyPrependedPage?.messageGroups.reduce(
        (acc, group) => acc + group.messages.length, 0
      ) ?? 0;

      setFirstItemIndex((prev) => prev - itemsAdded);
    }
  }

  const fetchNewerMessages = async () => {
    if (messageQueryResult.isFetchingNextPage || !messageQueryResult.hasNextPage) return;

    await messageQueryResult.fetchNextPage();
  };

  // gallery
  const [galleryState, setGalleryState] = useState<MediaGalleryState>({
    items: [],
    currentIndex: 0,
  });

  const handleAttachmentClick = (messageAttachments: Attachment[], clickedIndex: number) => {
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

    onMessageEdit(editingMessage, newBody?.trim() ?? null);
  };

  const [deletingMessage, setDeletingMessage] = useState<TimelineMessageDto | undefined>(undefined);

  // signalr events
  // change the cache pages when message received
  useSignalREvent("MessageReceived", async (event: MessageReceivedEvent) => {
    const senderId = event.message.senderUserId;

    if (userProfiles[senderId]) {
      appendMessage(event.message, userProfiles[senderId]);
    } else {
      // if we don't know this user, fetch from api
      try {
        const userQuery = await queryClient.query({
          queryKey: useGetUserIdentityProfileQuery.getKey({ id: senderId }),
          queryFn: useGetUserIdentityProfileQuery.fetcher({ id: senderId }),
          staleTime: 30 * 60 * 1000,
        });

        appendMessage(event.message, userQuery.user ?? undefined);
      } catch (error) {
        console.error("Failed to fetch user summary for new message", error);
      }
    }
  });

  useSignalREvent("MessageEdited", async (event: MessageEditedEvent) => {
    editMessage(event.message.id, event.message.body);
  });

  useSignalREvent("MessageDeleted", async (event: MessageDeletedEvent) => {
    deleteMessage(event.messageId);
  });

  // timeline entries
  const timelineItems = useTimelineEntries(messageClusters, userProfiles, editingMessage?.id ?? undefined);
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
      onAttachmentClick: handleAttachmentClick,
      onEditSaved: (newBody) => handleSaveEdit(newBody),
    },
    states: {
      viewportWidth: 0,
      editingMessageDraft: editingMessageDraft,
    }
  };

  if (messageQueryResult.isLoading) {
    return <div>Loading chat...</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full text-white bg-gray-700">
      <Virtuoso
        data={timelineItems}
        alignToBottom={true}
        followOutput={(isAtBottom) => (isAtBottom ? 'smooth' : false)}
        initialTopMostItemIndex={firstItemIndex + timelineItems.length - 1}
        startReached={fetchOlderMessages}
        endReached={fetchNewerMessages}
        overscan={10}
        components={{
          Header: () => (
            messageQueryResult.isFetchingPreviousPage ? (
              <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                Loading older messages...
              </div>
            ) : null
          ),
          Footer: () => (
            messageQueryResult.isFetchingNextPage ? (
              <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>
                Loading newer messages...
              </div>
            ) : null
          )
        }}
        itemContent={(_index, timelineItem) => {
          if (!timelineItem) return null;

          return timelineItem.render(0, timelineContext);
        }}
      />

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
          onDownloadRequested={() => {
            const downloadUrl = messageService.getAttachmentDownloadUrl(galleryState.items[galleryState.currentIndex].id);

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
            onMessageDelete(deletingMessage);
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