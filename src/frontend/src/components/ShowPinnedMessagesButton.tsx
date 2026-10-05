import {Popover} from "radix-ui";
import IconButton from "./IconButton.tsx";
import {FaThumbtack} from "react-icons/fa6";
import {BsPinAngleFill} from "react-icons/bs";
import MessageBody from "./chat/MessageBody.tsx";
import {Virtuoso} from "react-virtuoso";

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
              computeItemKey={(index, item) => item.id}
              firstItemIndex={0}
              overscan={5}
              itemContent={(_index, item) => (
                <div className="border-2 border-gray-600 rounded-md p-2">
                  <MessageBody content={item.body}/>
                </div>
              )}
            />
          </section>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}