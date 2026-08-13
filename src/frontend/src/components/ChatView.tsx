import type {
  Attachment,
  GetMessagesResponse,
  MessageDto,
  UserIdentityProfileDto
} from "../api/responses.ts";
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
import AlertActionDialog from "./AlertActionDialog.tsx";
import {useChatContainerContext} from "../contexts/ChatContainerContext.tsx";
import {useFetchUserBasicProfile} from "../hooks/fetchUserBasicProfile.ts";
import useTimelineEntries from "../hooks/useTimelineEntries.ts";
import type {TimelineContext} from "./chat/TimelineContext.ts";

type MediaGalleryState = {
  items: { id: string; type: string }[];
  currentIndex: number;
};

export interface QueryModification {
  appendMessage: (message: MessageDto, userProfile?: UserIdentityProfileDto) => void;
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

  const getUserBasicProfile = useFetchUserBasicProfile();

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

  const [isReady, setIsReady] = useState(false);
  const {width: viewportWidth = 0} = useResizeObserver({ref: viewportRef});

  // jump to the bottom when the messages are rendered
  useLayoutEffect(() => {
    if (messageGroups.length > 0 && !isReady) {
      requestAnimationFrame(() => {
        const virtualizer = virtualizerRef.current;
        if (!virtualizer) return;

        virtualizer.scrollToIndex(virtualizer.options.count - 1, {align: 'end'});

        requestAnimationFrame(() => setIsReady(true));
      });
    } else if (!isLoading && messageGroups.length === 0) {
      setIsReady(true);
    }
  }, [messageGroups.length, isLoading, isReady]);

  // jump to bottom automatically when something arrive.
  const lastGroupMessageCount = messageGroups.length === 0 ? null : messageGroups.at(-1)?.messages.length;

  const previousMessageCount = useRef({
    groupCount: messageGroups.length,
    lastGroupCount: lastGroupMessageCount,
  });

  useEffect(() => {
    if ((messageGroups.length > previousMessageCount.current.groupCount || (lastGroupMessageCount && previousMessageCount.current.lastGroupCount && lastGroupMessageCount > previousMessageCount.current.lastGroupCount)) && isReady) {
      const distanceFromBottom = viewportRef.current.scrollHeight - viewportRef.current.scrollTop - viewportRef.current.clientHeight;

      // why not == 0? idk im too tired to think about it lmao
      const isNearBottom = distanceFromBottom < 50;

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
  const [editingMessage, setEditingMessage] = useState<MessageDto | undefined>(undefined);
  const [editingMessageDraft, setEditingMessageDraft] = useState<string | null>(null);

  const handleSaveEdit = async (newBody: string | null) => {
    if (editingMessage === undefined) return;

    setEditingMessage(undefined);
    setEditingMessageDraft(null);

    onMessageEdit(editingMessage, newBody?.trim() ?? null);
  };

  const [deletingMessage, setDeletingMessage] = useState<MessageDto | undefined>(undefined);

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
        // Replace with your actual user service fetch call
        const response = await getUserBasicProfile(senderId);
        knownUser = response.data ?? undefined;
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

      <AlertActionDialog
        panelClassName="w-128"
        title={"Are you sure?"}
        description={"This action cannot be undone. You will never see this message and its attachments ever again."}
        open={!!deletingMessage}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingMessage(undefined);
          }
        }}
        actionButton={(
          <button className="button-theme-danger cursor-pointer px-3 py-2 rounded-md"
                  onClick={() => deletingMessage && onMessageDelete(deletingMessage)}>
            Delete message
          </button>
        )}
      />
    </div>
  );
}