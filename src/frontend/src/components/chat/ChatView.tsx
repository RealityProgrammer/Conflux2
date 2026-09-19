import type {
  Attachment,
  TimelineMessageDto,
  UserIdentityProfileDto
} from "../../api/types.ts";
import {useEffect, useLayoutEffect, useRef, useState} from "react";
import MediaPreviewGallery from "../MediaPreviewGallery.tsx";
import {messageService} from "../../api/messageService.ts";
import {useQueryClient} from "@tanstack/react-query";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {MessageDeletedEvent, MessageEditedEvent, MessageReceivedEvent} from "../../api/events.ts";
import {useChatContainerContext} from "../../contexts/ChatContainerContext.tsx";
import useTimelineEntries from "../../hooks/useTimelineEntries.ts";
import type {TimelineContext} from "./TimelineContext.ts";
import {useGetUserIdentityProfileQuery} from "../../graphql/queries.ts";
import Dialog from "../Dialog.tsx";
import {Dialog as RadixDialog} from "radix-ui";
import {Virtuoso} from "react-virtuoso";
import {BsBoxArrowUpRight} from "react-icons/bs";

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
    messageQueryResult: {
      isFetchingPreviousPage, hasPreviousPage, fetchPreviousPage,
      isFetchingNextPage, hasNextPage, fetchNextPage,
      isLoading,
    },
    messageClusters,
    userProfiles,
    appendMessage,
    editMessage,
    deleteMessage,
    handleEditMessage,
    handleDeleteMessage,
    setReplyingMessage,
  } = useChatContainerContext()!;

  const queryClient = useQueryClient();

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

  const handleAttachmentClick = (messageAttachments: Attachment[], clickedIndex: number) => {
    setGalleryState({
      items: messageAttachments.map(att => ({id: att.id, type: att.type})),
      currentIndex: clickedIndex
    });
  };

  const [accessingExternalUrl, setAccessingExternalUrl] = useState<string | undefined>(undefined);

  const onExternalLinkClicked = (url?: string) => {
    setAccessingExternalUrl(url);
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
      onEditSaved: (newBody) => handleSaveEdit(newBody),
      onAttachmentClick: handleAttachmentClick,
      onExternalLinkClicked: onExternalLinkClicked,
    },
    states: {
      viewportWidth: 0,
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

  if (isLoading) {
    return <div>Loading chat...</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full text-white bg-gray-700">
      <Virtuoso
        data={timelineItems}
        alignToBottom={true}
        followOutput={(isAtBottom) => (isAtBottom ? 'smooth' : false)}
        initialTopMostItemIndex={firstItemIndex + timelineItems.length - 1}
        firstItemIndex={firstItemIndex}
        startReached={fetchOlderMessages}
        endReached={fetchNewerMessages}
        overscan={10}
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
        itemContent={(_index, timelineItem) => {
          if (!timelineItem) return null;

          return timelineItem.render(timelineContext);
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
            handleDeleteMessage(deletingMessage);
            setDeletingMessage(undefined);
          }
        }}
      />

      <ExternalLinkConfirmationDialog
        externalUrl={accessingExternalUrl}
        open={!!accessingExternalUrl}
        onOpenChange={(open) => {
          if (!open) {
            setAccessingExternalUrl(undefined);
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

const CONFIRMATION_DELAY = 5000;

function ExternalLinkConfirmationDialog({
  externalUrl,
  open,
  onOpenChange,
}: { externalUrl: string | undefined, open: boolean, onOpenChange: (open: boolean) => void}) {
  const [canConfirm, setCanConfirm] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (open) {
      // reset states when the dialog opens
      setCanConfirm(false);
      setProgress(0);

      // start the visual CSS transition (added a bit delay at the start)
      const startAnimTimer = setTimeout(() => {
        setProgress(100);
      }, 50);

      // unlock button
      const enableTimer = setTimeout(() => {
        setCanConfirm(true);
      }, CONFIRMATION_DELAY + 50);

      return () => {
        clearTimeout(startAnimTimer);
        clearTimeout(enableTimer);
      };
    } else {
      setProgress(0);
      setCanConfirm(false);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Prepare to be in the barren land"
      subtitle="It is dangerous out there..."
      contentClassName="centered-dialog w-160 rounded-xl text-white bg-gray-650 outline-none"
      headerIcon={(
        <BsBoxArrowUpRight className="fill-white size-10"/>
      )}
      footerContent={(
        <div className="w-full flex flex-row justify-end p-3 gap-3">
          <RadixDialog.Close
            type="button"
            className="cursor-pointer basis-20 outline-none"
          >
            Cancel
          </RadixDialog.Close>

          <button
            disabled={!canConfirm}
            className={`relative overflow-hidden outline-none w-40 py-2 rounded-md ${canConfirm ? "cursor-pointer" : "cursor-not-allowed"}`}
            onClick={() => {
              onOpenChange(false);

              if (!externalUrl) return;

              const link = document.createElement("a");
              link.href = externalUrl;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            <div className="absolute inset-0 bg-red-600" />
            <div
              className="absolute left-0 top-0 bottom-0 bg-green-600 ease-linear"
              style={{
                width: `${progress}%`,
                transitionProperty: "width",
                transitionDuration: progress === 100 ? `${CONFIRMATION_DELAY}ms` : "0ms",
              }}
            />

            <span className="relative z-10 text-white font-medium select-none flex items-center justify-center">
              {canConfirm ? "Confirm Redirect" : "Wait..."}
            </span>
          </button>
        </div>
      )}
    >
      <div className="p-3 space-y-3">
        <p>
          Are you sure you want to access this external URL?<br/>
          Look closely, it can be a trap...<br/>
        </p>

        <span className="mt-3">
          External URL:

          <pre className="mt-1 p-2 bg-black/8 border-2 border-gray-500 rounded-md text-wrap text-sm">
            {externalUrl}
          </pre>
        </span>
      </div>
    </Dialog>
  )
}