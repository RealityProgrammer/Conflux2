import {Popover} from "radix-ui";
import IconButton from "./IconButton.tsx";
import {FaThumbtack} from "react-icons/fa6";
import {BsPinAngleFill} from "react-icons/bs";
import MessageBody from "./chat/MessageBody.tsx";
import {Virtuoso} from "react-virtuoso";
import {MessageRow} from "./chat/MessageRow.tsx";
import MessageAttachments from "./chat/MessageAttachments.tsx";
import {userService} from "../api/userService.ts";

interface ShowPinnedMessagesButtonProps {

}

export default function ShowPinnedMessagesButton({}) {
  const pinnedMessages = [
    {
      id: crypto.randomUUID(),
      sender: {
        id: "019f936c-5b43-7f09-a05e-9d5b28913131",
        avatarRevision: 1686523411,
        displayName: "User0",
      },
      body: "Pinned message 1",
    },
    {
      id: crypto.randomUUID(),
      sender: {
        id: "019f936c-5b43-7f09-a05e-9d5b28913131",
        avatarRevision: 1686523411,
        displayName: "User0",
      },
      body: "Pinned message 2",
    },
    {
      id: crypto.randomUUID(),
      sender: {
        id: "019f936c-5b43-7f09-a05e-9d5b28913131",
        avatarRevision: 1686523411,
        displayName: "User0",
      },
      body: "Pinned message 3",
    },
  ]

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
            <Virtuoso
              data={pinnedMessages}
              computeItemKey={(_index, item) => item.id}
              firstItemIndex={0}
              overscan={5}
              itemContent={(_index, message) => (
                <div className="pb-1">
                  <div className="p-2 border-2 border-gray-600 rounded-md group bg-black/8">
                    <MessageRow.Row
                      header={{
                        senderDisplayName: message.sender.displayName,
                        avatarSrc: message.sender.avatarRevision ? userService.getAvatarUrl(message.sender.id, message.sender.avatarRevision) : undefined,
                        avatarAlt: `Avatar of ${message.sender.displayName}`,
                      }}
                      date={new Date()}
                    >
                      <div className="flex-1 space-y-1">
                        <MessageBody
                          content={message.body}
                        />

                        {/*{message.attachments && message.attachments.length > 0 && (*/}
                        {/*  <MessageAttachments*/}
                        {/*    attachments={message.attachments}*/}
                        {/*    onAttachmentClick={handleAttachmentClicked}*/}
                        {/*  />*/}
                        {/*)}*/}
                      </div>
                    </MessageRow.Row>
                  </div>
                </div>
              )}
            />
          </section>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}