import {useDebounceCallback} from "usehooks-ts";
import {useRef} from "react";
import {useVirtualizer} from "@tanstack/react-virtual";
import {BsPerson, BsSearch} from "react-icons/bs";
import {Avatar, ScrollArea} from "radix-ui";

export default function FriendListTabContent() {
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
                                <div key={virtualItem.key}
                                     className="absolute top-0 left-0 w-full p-1.5 flex flex-row gap-1 items-center hover-highlight"
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
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea.Viewport>

                <ScrollArea.Scrollbar
                    className="flex touch-none select-none p-0.5 transition-colors duration-160 ease-out hover-highlight w-2"
                    orientation="vertical"
                >
                    <ScrollArea.Thumb className="relative flex-1 rounded-[10px] bg-mauve10 before:absolute before:left-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2 bg-gray-400"/>
                </ScrollArea.Scrollbar>
            </ScrollArea.Root>
        </div>
    );
}