import {Popover} from "radix-ui";
import IconButton from "./IconButton.tsx";
import {FaThumbtack} from "react-icons/fa6";
import {BsExclamationTriangle, BsPinAngleFill} from "react-icons/bs";
import MessageBody from "./chat/MessageBody.tsx";
import {Virtuoso} from "react-virtuoso";
import {MessageRow} from "./chat/MessageRow.tsx";
import MessageAttachments from "./chat/MessageAttachments.tsx";
import {userService} from "../api/userService.ts";
import {
  type GetConversationPinnedMessagesQuery,
} from "../graphql/infiniteQueries.ts";
import usePinnedMessages from "../hooks/usePinnedMessages.ts";
import useSignalREvent from "../hooks/useSignalREvent.ts";
import type {MessagePinnedEvent, MessageUnpinnedEvent} from "../api/events.ts";
import {useState} from "react";

interface ShowPinnedMessagesButtonProps {
  conversationId: string;
  onPinnedMessageClick: (messageId: string) => void;
}

export default function ShowPinnedMessagesButton({
  conversationId,
  onPinnedMessageClick,
}: ShowPinnedMessagesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  const {
    queryResult: { data, isLoading, isError },
    append: appendPinnedMessage,
    remove: removePinnedMessage,
  } = usePinnedMessages(conversationId, { enabled: hasBeenOpened, staleTime: 1000 * 60 * 15 });

  const allElements = data?.pages.flatMap((page) => page?.pinnedMessages.nodes ?? []) ?? [];

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);

    if (open && !hasBeenOpened) {
      setHasBeenOpened(true);
    }
  };

  const handleClickOnPinnedMessage = (messageId: string) => {
    setIsOpen(false);
    onPinnedMessageClick(messageId);
  }

  useSignalREvent("MessagePinned", (event: MessagePinnedEvent) => {
    if (!hasBeenOpened) return;
    appendPinnedMessage(event.message);
  });

  useSignalREvent("MessageUnpinned", (event: MessageUnpinnedEvent) => {
    if (!hasBeenOpened) return;
    removePinnedMessage(event.messageId);
  });

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <IconButton theme="default">
          <FaThumbtack className="size-6"/>
        </IconButton>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side="top"
          sideOffset={5}
          align="end"
          className="w-96 h-128 border-2 border-gray-600 rounded-lg bg-gray-725 text-white shadow-lg flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <header className="p-2 border-b-2 border-gray-600">
            <p>
              <BsPinAngleFill className="size-8 fill-white inline mr-2"/>

              <span className="text-lg font-bold">Pinned messages</span>
            </p>
          </header>

          <section className="flex-1 min-h-0 overflow-y-auto p-2">
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
  allElements: NonNullable<GetConversationPinnedMessagesQuery["pinnedMessages"]["nodes"]>;
  isLoading: boolean;
  isError: boolean;
  onPinnedMessageClick: (messageId: string) => void;
}

function ContentDisplay({
  allElements,
  isLoading,
  isError,
  onPinnedMessageClick
}: ContentDisplayProps) {
  return (
    <>
      {isLoading ? (
        <>
          {[...new Array(10).keys()].map((_, index) => (
            <div key={index} className="pb-1">
              <div className="p-2 border-2 border-gray-600 rounded-md group bg-black/8">
                <MessageRow.HeaderSkeleton>
                  <MessageRow.BodySkeleton/>
                </MessageRow.HeaderSkeleton>
              </div>
            </div>
          ))}
        </>
      ) : isError ? (
        <div className="size-full flex flex-col gap-1 justify-center items-center">
          <BsExclamationTriangle className="size-10 fill-white"/>
          <p>Failed to load pinned messages</p>
        </div>
      ) : (
        <Virtuoso
          data={allElements}
          computeItemKey={(_index, item) => item.id}
          firstItemIndex={0}
          overscan={5}
          itemContent={(_index, message) => (
            <div className="pb-1">
              <div className="p-2 border-2 border-gray-600 rounded-md group bg-black/8 cursor-pointer" onClick={() => onPinnedMessageClick(message.id)}>
                <MessageRow.Row
                  header={{
                    senderDisplayName: message.sender?.displayName ?? "???",
                    avatarSrc: message.sender?.avatarRevision ? userService.getAvatarUrl(message.sender.id, message.sender.avatarRevision) : undefined,
                    avatarAlt: message.sender ? `Avatar of ${message.sender.displayName ?? "???"}` : undefined,
                  }}
                  date={new Date()}
                >
                  <div className="flex-1 space-y-1">
                    <MessageBody
                      content={message.body}
                    />

                    {message.attachments && message.attachments.length > 0 && (
                      <MessageAttachments attachments={message.attachments} onAttachmentClick={() => {}}/>
                    )}
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