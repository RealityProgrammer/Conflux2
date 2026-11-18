import { Tabs } from "radix-ui";
import { BsPeople } from "react-icons/bs";
import { useState } from "react";
import { useDocumentTitle } from "usehooks-ts";
import SearchUserTabContent from "./SearchUserTabContent.tsx";
import FriendListTabContent from "./FriendListTabContent.tsx";
import PendingRequestsTabContent from "./PendingRequestsTabContent.tsx";

export default function FriendsPage() {
  useDocumentTitle("Conflux - Friends");

  const [tabValue, setTabValue] = useState("friends");

  return (
    <div className="flex size-full flex-col overflow-hidden">
      <header className="bg-gray-750 flex flex-none basis-10 flex-row items-center border-b-2 border-b-gray-600 px-2">
        <BsPeople className="mr-2 size-6 fill-white" />

        <p className="text-white">Everybody need a friend or two...</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-gray-700 px-2 pb-2">
        <Tabs.Root
          value={tabValue}
          onValueChange={setTabValue}
          className="mt-2 flex h-full min-h-0 flex-1 flex-col text-white"
        >
          <Tabs.List className="flex flex-none flex-row flex-nowrap gap-3 border-b-2 border-b-gray-600">
            <Tabs.Trigger
              value="friends"
              className={`hover-highlight cursor-pointer rounded-t-md px-2 py-1 ${tabValue === "friends" && "bg-white/8"}`}
            >
              Friends
            </Tabs.Trigger>

            <Tabs.Trigger
              value="pending"
              className={`hover-highlight cursor-pointer rounded-t-md px-2 py-1 ${tabValue === "pending" && "bg-white/8"}`}
            >
              Pending
            </Tabs.Trigger>

            <Tabs.Trigger
              value="blocked"
              className={`hover-highlight cursor-pointer rounded-t-md px-2 py-1 ${tabValue === "blocked" && "bg-white/8"}`}
            >
              Blocked
            </Tabs.Trigger>

            <Tabs.Trigger
              value="add-friend"
              className={`hover-highlight cursor-pointer rounded-t-md px-2 py-1 ${tabValue === "add-friend" && "bg-white/8"}`}
            >
              Add Friend
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="friends" className="min-h-0 flex-1 pt-2">
            <FriendListTabContent />
          </Tabs.Content>

          <Tabs.Content value="pending" className="min-h-0 flex-1 pt-2">
            <PendingRequestsTabContent />
          </Tabs.Content>

          <Tabs.Content value="blocked" className="min-h-0 flex-1 pt-2">
            // TODO
          </Tabs.Content>

          <Tabs.Content value="add-friend" className="min-h-0 flex-1 pt-2">
            <SearchUserTabContent />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </div>
  );
}
