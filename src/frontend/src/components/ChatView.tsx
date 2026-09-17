import type {
  Attachment,
  GetMessagesResponse,
  TimelineMessageDto,
  UserIdentityProfileDto
} from "../api/types.ts";
import {type ReactNode, type RefObject, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState} from "react";
import {type ReactVirtualizer} from "@tanstack/react-virtual";
import {useResizeObserver} from "usehooks-ts";
import MediaPreviewGallery from "./MediaPreviewGallery.tsx";
import {messageService} from "../api/messageService.ts";
import VirtualizedScrollList from "./VirtualizedScrollList.tsx";
import Spinner from "./Spinner.tsx";
import useGetMessages from "../hooks/useGetMessages.ts";
import {type InfiniteData, useQueryClient} from "@tanstack/react-query";
import useSignalREvent from "../hooks/useSignalREvent.ts";
import type {MessageEditedEvent, MessageReceivedEvent} from "../api/events.ts";
import {useChatContainerContext} from "../contexts/ChatContainerContext.tsx";
import useTimelineEntries from "../hooks/useTimelineEntries.ts";
import type {TimelineContext} from "./chat/TimelineContext.ts";
import {useGetUserIdentityProfileQuery} from "../graphql/queries.ts";
import Dialog from "./Dialog.tsx";
import {Dialog as RadixDialog} from "radix-ui";

function useChatAutoScroll({
  messageGroups,
  isLoading,
  virtualizerRef,
  viewportRef,
}: {
  messageGroups: Array<{ messages: unknown[] }>;
  isLoading: boolean;
  virtualizerRef: RefObject<ReactVirtualizer<HTMLDivElement, Element>>;
  viewportRef: RefObject<HTMLDivElement>;
}) {
  const [isReady, setIsReady] = useState(false);
  const isReadyRef = useRef(false);

  const groupCount = messageGroups.length;
  const lastGroupMessageCount = messageGroups.at(-1)?.messages.length ?? 0;

  // initial jump to the bottom
  useLayoutEffect(() => {
    if (isReadyRef.current) return;

    if (groupCount > 0) {
      const raf1 = requestAnimationFrame(() => {
        const virtualizer = virtualizerRef.current;
        if (virtualizer) {
          virtualizer.scrollToIndex(virtualizer.options.count - 1, { align: 'end' });
        }

        const raf2 = requestAnimationFrame(() => {
          isReadyRef.current = true;
          setIsReady(true);
        });

        return () => cancelAnimationFrame(raf2);
      });

      return () => cancelAnimationFrame(raf1);
    }

    if (!isLoading && groupCount === 0) {
      isReadyRef.current = true;
      setIsReady(true);
    }
  }, [groupCount, isLoading, virtualizerRef]);

  // autoscroll on new message arrivals
  const previousMessageCount = useRef({
    groupCount,
    lastGroupCount: lastGroupMessageCount,
  });

  useEffect(() => {
    const prev = previousMessageCount.current;
    const hasNewMessages =
      groupCount > prev.groupCount ||
      (lastGroupMessageCount > 0 && lastGroupMessageCount > prev.lastGroupCount);

    if (hasNewMessages && isReady && viewportRef.current) {
      const viewport = viewportRef.current;
      const distanceFromBottom =
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;

      if (distanceFromBottom < 50) {
        requestAnimationFrame(() => {
          const virtualizer = virtualizerRef.current;
          if (virtualizer) {
            virtualizer.scrollToIndex(virtualizer.options.count - 1, { align: 'end' });
          }
        });
      }
    }

    previousMessageCount.current = {
      groupCount,
      lastGroupCount: lastGroupMessageCount,
    };
  }, [groupCount, lastGroupMessageCount, isReady, viewportRef, virtualizerRef]);

  return { isReady };
}

type MediaGalleryState = {
  items: { id: string; type: string }[];
  currentIndex: number;
};

export interface QueryModification {
  appendMessage: (message: TimelineMessageDto, userProfile?: UserIdentityProfileDto) => void;
  editMessage: (messageId: string, newBody: string | null) => void;
  deleteMessage: (messageId: string) => void;
}

export interface ChatViewProps {
  renderEmptyState?: () => ReactNode;
  queryModificationRef?: RefObject<QueryModification>;
}

export function ChatView({renderEmptyState, queryModificationRef}: ChatViewProps) {
  const {channelId, onMessageEdit, onMessageDelete, onMessageReplyRequested} = useChatContainerContext()!;

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
    queryKey,
    appendMessage,
    editMessage,
    deleteMessage,
  } = useGetMessages(channelId, 50);

  const {width: viewportWidth = 0} = useResizeObserver({ref: viewportRef});

  const { isReady } = useChatAutoScroll({
    messageGroups,
    isLoading,
    virtualizerRef,
    viewportRef,
  });

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
        const userQuery = await queryClient.query({
          queryKey: useGetUserIdentityProfileQuery.getKey({ id: senderId }),
          queryFn: useGetUserIdentityProfileQuery.fetcher({ id: senderId }),
          staleTime: 30 * 60 * 1000,
        });

        knownUser = userQuery.user ?? undefined;
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

  // timeline entries
  const timelineItems = useTimelineEntries(messageGroups, userProfiles, editingMessage?.id ?? undefined);
  const timelineContext: TimelineContext = {
    actions: {
      onMessageDeleteTrigger: setDeletingMessage,
      onMessageEditTrigger: setEditingMessage,
      onMessageReplyTrigger: onMessageReplyRequested,
      onEditDraftChange: (body: string | null) => setEditingMessageDraft(body),
      onEditCancel: () => {
        setEditingMessage(undefined);
        setEditingMessageDraft(null);
      },
      onAttachmentClick: handleAttachmentClick,
      onEditSaved: (newBody) => handleSaveEdit(newBody),
    },
    states: {
      viewportWidth: viewportWidth,
      editingMessageDraft: editingMessageDraft,
    }
  };

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
        itemCount={timelineItems.length}
        keyExtractor={(itemIndex) => itemIndex} // TODO: stable key extraction
        isLoading={isLoading}
        estimateSize={(target) => {
          if (target === 'previousLoader' || target === 'nextLoader') return 30;

          const entry = timelineItems[target.itemIndex];
          return entry.measureHeight(timelineContext);
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
          return timelineItems[itemIndex].render(virtualItem.size, timelineContext);
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