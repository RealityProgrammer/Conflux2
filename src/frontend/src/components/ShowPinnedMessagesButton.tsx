import { Popover } from "radix-ui";
import IconButton from "./IconButton.tsx";
import { FaThumbtack } from "react-icons/fa6";
import { BsExclamationTriangle, BsPinAngleFill } from "react-icons/bs";
import MessageBody from "./conversation/MessageBody.tsx";
import { Virtuoso } from "react-virtuoso";
import { MessageRow } from "./conversation/MessageRow.tsx";
import useQueryPinnedMessages from "../hooks/useQueryPinnedMessages.ts";
import useSignalREvent from "../hooks/useSignalREvent.ts";
import type {
  MessageDeletedEvent,
  MessagePinnedEvent,
  MessageUnpinnedEvent,
} from "../api/events.ts";
import { useState } from "react";
import { useChatContainerContext } from "../contexts/ChatContainerContext.tsx";
import { queryClient } from "../main.tsx";
import type { KeyedPaginatedPage, PinnedMessageDto } from "../api/types.ts";
import type { InfiniteData } from "@tanstack/react-query";

export default function ShowPinnedMessagesButton() {
  const { requestJump, conversationId } = useChatContainerContext();

  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  const { data, isLoading, isError } = useQueryPinnedMessages(conversationId, {
    enabled: hasBeenOpened,
    staleTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const allElements: PinnedMessageDto[] =
    data?.pages.flatMap((page) => page?.elements ?? []) ?? [];

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (open && !hasBeenOpened) {
      setHasBeenOpened(true);
    }
  };

  const handleClickOnPinnedMessage = (messageId: string) => {
    setIsOpen(false);
    requestJump(messageId);
  };

  useSignalREvent("MessagePinned", (_event: MessagePinnedEvent) => {
    if (!hasBeenOpened) return;

    // TODO: Append instead of invalidate
    // appendPinnedMessage(event.message);

    queryClient.invalidateQueries({
      queryKey: useQueryPinnedMessages.getKey(conversationId),
    });
  });

  useSignalREvent(
    ["MessageUnpinned", "MessageDeleted"],
    (event: MessageUnpinnedEvent | MessageDeletedEvent) => {
      if (!hasBeenOpened) return;

      queryClient.setQueryData<
        InfiniteData<KeyedPaginatedPage<string, PinnedMessageDto>>
      >(useQueryPinnedMessages.getKey(conversationId), (oldData) => {
        if (!oldData) return oldData;

        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            elements: page.elements.filter((msg) => msg.id !== event.messageId),
          })),
        };
      });
    },
  );

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <IconButton theme="default">
          <FaThumbtack className="size-5" />
        </IconButton>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={5}
          align="end"
          className="bg-gray-725 flex h-128 max-h-(--radix-popover-content-available-height) w-96 flex-col rounded-lg border-2 border-gray-600 text-white shadow-lg"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <header className="border-b-2 border-gray-600 p-2">
            <p>
              <BsPinAngleFill className="mr-2 inline size-8 fill-white" />

              <span className="text-lg font-bold">Pinned messages</span>
            </p>
          </header>

          <section className="min-h-0 flex-1 overflow-y-auto p-2">
            <ContentDisplay
              allElements={allElements}
              isLoading={isLoading}
              isError={isError}
              onPinnedMessageClick={handleClickOnPinnedMessage}
            />
          </section>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

interface ContentDisplayProps {
  allElements: PinnedMessageDto[];
  isLoading: boolean;
  isError: boolean;
  onPinnedMessageClick: (messageId: string) => void;
}

function ContentDisplay({
  allElements,
  isLoading,
  isError,
  onPinnedMessageClick,
}: ContentDisplayProps) {
  return (
    <>
      {isLoading ? (
        <>
          {[...new Array(10).keys()].map((_, index) => (
            <div key={index} className="pb-1">
              <div className="group rounded-md border-2 border-gray-600 bg-black/8 p-2">
                <MessageRow.HeaderSkeleton>
                  <MessageRow.BodySkeleton />
                </MessageRow.HeaderSkeleton>
              </div>
            </div>
          ))}
        </>
      ) : isError ? (
        <div className="flex size-full flex-col items-center justify-center gap-1">
          <BsExclamationTriangle className="size-10 fill-white" />
          <p className="select-none">Failed to load pinned messages</p>
        </div>
      ) : allElements.length == 0 ? (
        <div className="flex size-full flex-col items-center justify-center gap-1">
          <span className="text-sm text-gray-500 select-none">
            It is so very empty here
          </span>
        </div>
      ) : (
        <Virtuoso
          data={allElements}
          computeItemKey={(_index, item) => item.id}
          firstItemIndex={0}
          overscan={5}
          itemContent={(_index, message) => (
            <div className="pb-1">
              <div
                className="cursor-pointer rounded-md border-2 border-gray-600 bg-black/8 p-2"
                onClick={() => onPinnedMessageClick(message.id)}
              >
                <MessageRow.Row
                  header={{
                    senderDisplayName: message.sender?.displayName ?? "???",
                    senderId: message.sender?.id,
                    senderAvatarVersion: message.sender?.avatarVersion,
                    avatarAlt: message.sender
                      ? `Avatar of ${message.sender.displayName ?? "???"}`
                      : undefined,
                  }}
                  date={new Date(message.createdAt)}
                >
                  <div className="flex-1 space-y-1">
                    <MessageBody content={message.body} />

                    {/* TODO: Should we allow attachments in pinned message display? */}
                    {/*{message.attachments && message.attachments.length > 0 && (*/}
                    {/*  <MessageAttachments attachments={message.attachments} onAttachmentClick={() => {}}/>*/}
                    {/*)}*/}
                  </div>
                </MessageRow.Row>
              </div>
            </div>
          )}
        />
      )}
    </>
  );
}
