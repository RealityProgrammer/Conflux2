import {Avatar, ScrollArea, Tabs} from "radix-ui";
import {BsPeople, BsPerson, BsSearch} from "react-icons/bs";
import {useRef, useState} from "react";
import {useDebounceCallback} from "usehooks-ts";
import {useVirtualizer} from "@tanstack/react-virtual";

function FriendListTabContent() {
    const searchDebounce = useDebounceCallback(async (value) => {
        console.log("begin search for " + value);
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("finish search.");
    }, 500);

    const items = [...Array(100).keys()];

    const scrollViewport = useRef<HTMLDivElement | null>(null);

    const friendsVirtualize = useVirtualizer({
        count: items.length,
        getScrollElement: () => scrollViewport.current,
        estimateSize: () => 52,
        overscan: 5,
    })

    return (
        <div className="flex flex-col gap-2 h-full">
            <div className="flex-none relative w-full flex items-center">
                <BsSearch className="absolute left-2.5 size-4 fill-white pointer-events-none" />

                <input
                    className="input-field w-full h-11 px-3 pl-8"
                    placeholder="Search..."
                    onChange={(e) => {
                        searchDebounce(e.target.value);
                    }}
                />
            </div>

            <ScrollArea.Root className="flex-1 overflow-hidden rounded">
                <ScrollArea.Viewport ref={scrollViewport} className="border-2 border-gray-600 rounded-md size-full">
                    <div
                        className="relative w-full"
                        style={{ height: `${friendsVirtualize.getTotalSize()}px` }}
                    >
                        { friendsVirtualize.getVirtualItems().map((virtualItem) => {
                            const value = items[virtualItem.index];

                            return (
                                <p key={virtualItem.key}
                                   className="absolute top-0 left-0 w-full p-1.5 flex flex-row gap-1 items-center hover:bg-white/12"
                                   style={{
                                       height: `${virtualItem.size}px`,
                                       transform: `translateY(${virtualItem.start}px)`,
                                   }}
                                >
                                    <Avatar.Root
                                        className="flex-none size-10 select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer">
                                        <Avatar.Image
                                            className="size-full rounded-[inherit] object-cover"
                                            src="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?&w=128&h=128&dpr=2&q=80"
                                            alt="Test"
                                        />
                                        <Avatar.Fallback
                                            className="leading-1 flex size-full items-center justify-center bg-white text-[15px] font-medium text-violet11"
                                            delayMs={600}
                                        >
                                            <BsPerson className="fill-black size-5/6"/>
                                        </Avatar.Fallback>
                                    </Avatar.Root>

                                    <p className="ml-2 whitespace-nowrap overflow-hidden text-ellipsis">
                                        Friend {value}
                                    </p>
                                </p>
                            );
                        })}
                    </div>
                </ScrollArea.Viewport>

                <ScrollArea.Scrollbar
                    className="flex touch-none select-none p-0.5 transition-colors duration-160 ease-out hover:bg-white/6 w-2"
                    orientation="vertical"
                >
                    <ScrollArea.Thumb className="relative flex-1 rounded-[10px] bg-mauve10 before:absolute before:left-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 bg-gray-400"/>
                </ScrollArea.Scrollbar>
            </ScrollArea.Root>
        </div>
    );
}

export default function FriendsPage() {
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
                        <Tabs.Trigger value="friends" className={`px-2 py-1 hover:bg-white/12 rounded-t-md cursor-pointer ${tabValue === "friends" && "bg-white/8"}`}>Friends</Tabs.Trigger>
                        <Tabs.Trigger value="blocked" className={`px-2 py-1 hover:bg-white/12 rounded-t-md cursor-pointer ${tabValue === "blocked" && "bg-white/8"}`}>Blocked</Tabs.Trigger>
                    </Tabs.List>

                    <Tabs.Content value="friends" className="pt-2 flex-1 min-h-0">
                        <FriendListTabContent/>
                    </Tabs.Content>

                    <Tabs.Content value="blocked" className="pt-2 flex-1 min-h-0">
                        Blocked
                    </Tabs.Content>
                </Tabs.Root>
            </div>
        </div>
    );
}