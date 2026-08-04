import { useAuthorization } from "../contexts/AuthContext.tsx";
import {Avatar, Separator, Tooltip} from "radix-ui";
import { userService } from "../api/userService.ts";
import {NavLink, Outlet, useLocation, useNavigate} from "react-router";
import {BsMegaphone, BsPeople, BsPerson} from "react-icons/bs";
import {useVirtualizer} from "@tanstack/react-virtual";
import {useRef} from "react";
import UserAvatar from "../components/UserAvatar.tsx";
import {useSignalR} from "../hooks/useSignalR.ts";
import {emitGlobalEvent} from "../hooks/useGlobalEvent.ts";
import type {
    FriendRequestAcceptedNotification,
    FriendRequestCanceledNotification,
    FriendRequestReceivedNotification, FriendRequestRejectedNotification, UnfriendedNotification
} from "../api/notifications.ts";
import {useDocumentTitle} from "usehooks-ts";

function Sidebar() {
    const auth = useAuthorization();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="flex-none flex flex-col px-1.5 gap-1 h-full bg-gray-775 border-r-2 border-r-gray-600">
            <Tooltip.Provider delayDuration={500}>
                <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                        <UserAvatar
                            userId={auth.userAuthorization?.id}
                            hasAvatar={auth.userProfile?.hasAvatar ?? false}
                            className="mt-1.5 flex-none size-12 select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer scale-100 hover:scale-110 transition-transform duration-200 ease-linear"
                            onClick={() => {
                                if (location.pathname !== "/lobby") {
                                    navigate("/lobby");
                                }
                            }}/>
                    </Tooltip.Trigger>

                    <Tooltip.Portal>
                        <Tooltip.Content side="right" sideOffset={5} className="select-none rounded-lg bg-gray-500">
                            <p className="text-white font-semibold px-3 py-1">To your private space</p>

                            <Tooltip.Arrow className="fill-gray-500" />
                        </Tooltip.Content>
                    </Tooltip.Portal>
                </Tooltip.Root>
            </Tooltip.Provider>

            <Separator.Root orientation="horizontal" decorative className="h-px bg-gray-600 my-1.5"/>

            <div className="flex-1 h-full">
            </div>
        </nav>
    );
}

function DirectMessagesList() {
    const items = [...Array(10000).keys()];
    const navigate = useNavigate();

    const parentRef = useRef<HTMLDivElement | null>(null);

    const rowVirtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 48,
        overscan: 5,
    });

    return (
        <div ref={parentRef} className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                    const value = items[virtualItem.index];

                    return (
                        <button
                            key={virtualItem.key}
                            className="absolute top-0 left-0 w-full p-1.5 flex flex-row gap-1 items-center hover-highlight rounded-lg cursor-pointer"
                            style={{
                                height: `${virtualItem.size}px`,
                                transform: `translateY(${virtualItem.start}px)`,
                            }}
                            onClick={() => {
                                navigate("/lobby/dm/" + crypto.randomUUID());
                            }}
                        >
                            <Avatar.Root className="flex-none size-9 select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer">
                                <Avatar.Image
                                    className="size-full rounded-[inherit] object-cover"
                                    src="https://images.unsplash.com/photo-1492633423870-43d1cd2775eb?&w=128&h=128&dpr=2&q=80"
                                    alt="Test"
                                />
                                <Avatar.Fallback
                                    className="leading-1 flex size-full items-center justify-center bg-white text-[15px] font-medium text-violet11"
                                    delayMs={600}
                                >
                                    <BsPerson className="fill-black size-5/6" />
                                </Avatar.Fallback>
                            </Avatar.Root>

                            <p className="ml-2 whitespace-nowrap overflow-hidden text-ellipsis">
                                Element Number {value}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function LocationSidebar() {
    return (
        <nav className="flex-none basis-72 px-1.5 pt-1.5 h-full bg-gray-725 border-r-2 border-r-gray-600 text-white overflow-y-auto flex flex-col overflow-hidden">
            <section className="flex-none">
                <header className="text-xs mb-1.5 font-bold text-gray-400 uppercase">System</header>

                <NavLink to="/lobby/announcements" className={({ isActive }) => `mb-1.5 p-2 rounded-md flex flex-row gap-2 items-center ${isActive ? 'bg-white/8' : 'hover-highlight'}`}>
                    <BsMegaphone className="size-6 fill-white"/>

                    <span className="font-semibold">Announcements</span>
                </NavLink>

                <NavLink to="/lobby/friends" className={({ isActive }) => `p-2 rounded-md flex flex-row gap-2 items-center ${isActive ? 'bg-white/8' : 'hover-highlight'}`}>
                    <BsPeople className="size-6 fill-white"/>

                    <span className="font-semibold">Friends</span>
                </NavLink>
            </section>

            <Separator.Root orientation="horizontal" decorative className="h-px bg-gray-600 my-2 flex-none"/>

            <section className="flex-1 flex flex-col min-h-0">
                <header className="text-xs mb-1.5 font-bold text-gray-400 uppercase flex-none">Direct Messages</header>

                <DirectMessagesList/>
            </section>
        </nav>
    );
}

export default function LobbyLayout() {
    useDocumentTitle("Lobby - Conflux");

    useSignalR(`${import.meta.env.VITE_BACKEND_HUBS_URL}/user-lobby`, {
        FriendRequestReceived: (notification: FriendRequestReceivedNotification) => {
            emitGlobalEvent("lobby:friendRequestReceived", notification);
        },

        FriendRequestCanceled: (notification: FriendRequestCanceledNotification) => {
            emitGlobalEvent("lobby:friendRequestCanceled", notification);
        },

        FriendRequestAccepted: (notification: FriendRequestAcceptedNotification) => {
            emitGlobalEvent("lobby:friendRequestAccepted", notification);
        },

        FriendRequestRejected: (notification: FriendRequestRejectedNotification) => {
            emitGlobalEvent("lobby:friendRequestRejected", notification);
        },

        Unfriended: (notification: UnfriendedNotification) => {
            emitGlobalEvent("lobby:unfriended", notification);
        },
    });

    return (
        <div className="h-dvh w-dvw overflow-hidden flex flex-row">
            <Sidebar/>
            <LocationSidebar/>

            <section className="flex-1 overflow-auto">
                <Outlet/>
            </section>
        </div>
    );
}