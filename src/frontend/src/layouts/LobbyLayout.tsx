import { useAuthorization } from "../contexts/AuthContext.tsx";
import {Avatar, Separator, Tooltip} from "radix-ui";
import { userService } from "../api/userService.ts";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BsPerson } from "react-icons/bs";

function Sidebar() {
    const auth = useAuthorization();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <nav className="flex-none flex flex-col px-1.5 gap-1 h-full bg-gray-775 border-r-2 border-r-gray-600">
            <Tooltip.Provider delayDuration={500}>
                <Tooltip.Root>
                    <Tooltip.Trigger asChild>
                        <Avatar.Root
                            className="mt-1.5 flex-none size-12 select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer scale-100 hover:scale-110 transition-transform duration-200 ease-linear"
                            onClick={() => {
                                if (location.pathname !== "/lobby") {
                                    navigate("/lobby");
                                }
                            }}
                        >
                            <Avatar.Image
                                className="size-full rounded-[inherit] object-cover"
                                src={auth.userAuthorization?.id === null ? undefined : userService.getAvatarUrl(auth.userAuthorization!.id, false)}
                                alt="User Avatar"
                            />
                            <Avatar.Fallback
                                className="leading-1 flex size-full items-center justify-center bg-white text-[15px] font-medium text-violet11"
                                delayMs={600}
                            >
                                <BsPerson className="fill-black size-5/6"/>
                            </Avatar.Fallback>
                        </Avatar.Root>
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

            <div className="flex-1 h-full bg-red-500">

            </div>
        </nav>
    );
}

function LocationSidebar() {
    return (
        <nav className="flex-none basis-72 flex flex-col px-1.5 gap-1 h-full bg-gray-725 border-r-2 border-r-gray-600">
        </nav>
    )
}

export default function LobbyLayout() {
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