import {Popover} from "radix-ui";
import IconButton from "./IconButton.tsx";
import {FaThumbtack} from "react-icons/fa6";
import {BsExclamationTriangle, BsPinAngleFill} from "react-icons/bs";
import MessageBody from "./chat/MessageBody.tsx";
import {Virtuoso} from "react-virtuoso";
import {MessageRow} from "./chat/MessageRow.tsx";
import MessageAttachments from "./chat/MessageAttachments.tsx";
import {userService} from "../api/userService.ts";
import {useInfiniteGetConversationPinnedMessagesQuery} from "../graphql/infiniteQueries.ts";
import Spinner from "./Spinner.tsx";

interface ShowPinnedMessagesButtonProps {
  conversationId: string;
}

export default function ShowPinnedMessagesButton({
  conversationId,
}: ShowPinnedMessagesButtonProps) {
  const { isLoading, isError, data } = useInfiniteGetConversationPinnedMessagesQuery(
    { conversationId, after: null },
    {
      initialPageParam: {after: null},
      getNextPageParam: (lastPage) => {
        const pageInfo = lastPage?.pinnedMessages.pageInfo;

        if (pageInfo?.hasNextPage && pageInfo?.endCursor) {
          return { after: pageInfo.endCursor };
        }

        return undefined;
      },
      staleTime: 1000 * 60 * 15,
    }
  );

  const allElements = data?.pages.flatMap((page) => page?.pinnedMessages.nodes ?? []) ?? [];

  return (
    <Popover.Root>
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
            {isLoading ? (
              <div className="size-full flex flex-row justify-center items-center">
                <Spinner className="size-10 fill-white"/>
              </div>
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
                    <div className="p-2 border-2 border-gray-600 rounded-md group bg-black/8">
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
          </section>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}