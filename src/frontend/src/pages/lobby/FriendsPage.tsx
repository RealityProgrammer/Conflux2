import {Tabs} from "radix-ui";
import {BsPeople} from "react-icons/bs";
import {useState} from "react";
import {useDocumentTitle} from "usehooks-ts";
import AddFriendTabContent from "./AddFriendTabContent.tsx";
import FriendListTabContent from "./FriendListTabContent.tsx";

export default function FriendsPage() {
    useDocumentTitle("Friends - Conflux");

    const [tabValue, setTabValue] = useState("friends");

    return (
        <div className="flex flex-col overflow-hidden size-full">
            <header className="flex-none basis-10 bg-gray-750 border-b-gray-600 border-b-2 flex flex-row items-center px-2">
                <BsPeople className="fill-white size-6 mr-2"/>

                <p className="text-white">Everybody need a friend or two...</p>
            </header>

            <div className="flex-1 bg-gray-700 flex flex-col min-h-0 px-2 pb-2">
                <Tabs.Root value={tabValue} onValueChange={setTabValue} className="flex-1 min-h-0 flex flex-col mt-2 text-white h-full">
                    <Tabs.List className="flex flex-row flex-nowrap gap-3 flex-none border-b-gray-600 border-b-2">
                        <Tabs.Trigger value="friends" className={`px-2 py-1 hover-highlight rounded-t-md cursor-pointer ${tabValue === "friends" && "bg-white/8"}`}>Friends</Tabs.Trigger>
                        <Tabs.Trigger value="pending" className={`px-2 py-1 hover-highlight rounded-t-md cursor-pointer ${tabValue === "pending" && "bg-white/8"}`}>Pending</Tabs.Trigger>
                        <Tabs.Trigger value="blocked" className={`px-2 py-1 hover-highlight rounded-t-md cursor-pointer ${tabValue === "blocked" && "bg-white/8"}`}>Blocked</Tabs.Trigger>
                        <Tabs.Trigger value="add-friend" className={`px-2 py-1 hover-highlight rounded-t-md cursor-pointer ${tabValue === "add-friend" && "bg-white/8"}`}>Add Friend</Tabs.Trigger>
                    </Tabs.List>

                    <Tabs.Content value="friends" className="pt-2 flex-1 min-h-0">
                        <FriendListTabContent/>
                    </Tabs.Content>

                    <Tabs.Content value="pending" className="pt-2 flex-1 min-h-0">
                        Pending
                    </Tabs.Content>

                    <Tabs.Content value="blocked" className="pt-2 flex-1 min-h-0">
                        Blocked
                    </Tabs.Content>

                    <Tabs.Content value="add-friend" className="pt-2 flex-1 min-h-0">
                        <AddFriendTabContent/>
                    </Tabs.Content>
                </Tabs.Root>
            </div>
        </div>
    );
}