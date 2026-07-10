import Logo from "../components/Logo.tsx";
import NavLink from "../components/NavLink.tsx";
import PageTitle from "../components/PageTitle.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";
import { Dialog } from "radix-ui";
import { useState, useRef, useEffect } from "react";
import { animate } from "animejs";
import {BsDoorClosed, BsDoorOpen, BsGear} from "react-icons/bs";

function AuthenticatedNavigationDrawer({ userName }: { userName: string }) {
    const [open, setOpen] = useState(false);

    const contentRef = useRef<HTMLDivElement | null>(null);
    const overlayRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (open && contentRef.current && overlayRef.current) {
            animate(contentRef.current, {
                translateX: '0%',
                duration: 300,
                delay: 250,
            });

            animate(overlayRef.current, {
                opacity: 1,
                duration: 300,
            });
        }
    }, [open]);

    const handleClose = () => {
        if (!contentRef.current || !overlayRef.current) {
            return;
        }

        animate(contentRef.current, {
            translateX: '100%',
            duration: 300,
        });

        animate(overlayRef.current, {
            opacity: 0,
            duration: 300,
            onComplete: () => {
                setOpen(false);
            }
        });
    };

    return (
        <Dialog.Root open={open} onOpenChange={(state) => {
            if (state) {
                setOpen(true);
            } else {
                handleClose();
            }
        }}>
            <Dialog.Trigger asChild>
                <button
                    className="float-end bg-transparent hover:bg-white/10 p-2 rounded-full inline-flex flex-row justify-end items-center gap-1 cursor-pointer text-white"
                >
                    { userName }
                </button>
            </Dialog.Trigger>

            <Dialog.Portal forceMount>
                {open && (
                    <>
                        <Dialog.Overlay
                            ref={overlayRef}
                            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                            style={{ opacity: 0 }}
                        />

                        <Dialog.Content
                            ref={contentRef}
                            className="fixed top-0 right-0 h-full z-50 bg-[#071318] border-l-2 border-l-[#353535] w-2/3 sm:w-1/2 md:w-1/3 p-5 overflow-hidden"
                            style={{ transform: 'translateX(100%)' }}
                            onEscapeKeyDown={(e) => {
                                e.preventDefault();
                                handleClose();
                            }}
                            onPointerDownOutside={(e) => {
                                e.preventDefault();
                                handleClose();
                            }}
                        >
                            <Dialog.Title className="font-medium text-white m-0">Select your destination</Dialog.Title>
                            <Dialog.Description className="text-gray-400 text-sm mt-3 mb-5">Where are we going next?</Dialog.Description>

                            <div className="flex flex-col gap-2">
                                <NavLink className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer w-full flex flex-row justify-center items-center gap-3 flex-none group" to="/lobby">
                                    <BsDoorClosed className="size-5 fill-white flex-none block group-hover:hidden"/>
                                    <BsDoorOpen className="size-5 fill-white flex-none hidden group-hover:block"/>

                                    Lobby
                                </NavLink>

                                <NavLink className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer w-full flex flex-row justify-center items-center gap-3 flex-none" to="/settings/account">
                                    <BsGear className="size-5 fill-white flex-none"/>

                                    Settings
                                </NavLink>
                            </div>
                        </Dialog.Content>
                    </>
                )}
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export default function HomePage(){
    const auth = useAuth();

    return (
        <>
            <PageTitle title="Homepage"/>

            <div className="fixed inset-0 z-[-1] bg-gray-900"></div>

            <header className="bg-[#071318] w-full border-b-2 border-b-[#353535] px-6 py-2 flex flex-row items-center">
                <section className="flex-none inline-flex flex-row justify-start items-center gap-4">
                    <Logo className="size-14"/>
                </section>

                <nav className="flex-4 overflow-y-auto flex flex-row gap-2 px-6 justify-center">
                    <NavLink
                        className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer flex-none"
                        to="#"
                    >
                        Home
                    </NavLink>

                    <NavLink
                        className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer flex-none"
                        to="#"
                    >
                        Safety
                    </NavLink>

                    <NavLink
                        className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer flex-none"
                        to="#"
                    >
                        Blog
                    </NavLink>

                    <NavLink
                        className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer flex-none"
                        to="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    >
                        Download
                    </NavLink>

                    <NavLink
                        className="text-white rounded-full px-7 py-2 font-bold border-2 border-indigo-500/30 shimmer flex-none"
                        to="#"
                    >
                        About
                    </NavLink>
                </nav>

                <section className="flex-1 flex flex-row justify-end">
                    { auth.isAuthenticated ?
                        <AuthenticatedNavigationDrawer userName="Placeholder Name"/>
                        :
                        <div className="button-group justify-end flex-auto">
                            <NavLink
                                to={{ pathname: "/auth", hash: "login" }}
                                className="text-white py-2 font-bold border-indigo-500/30 grow-0 shrink basis-24 text-center shimmer"
                            >
                                Login
                            </NavLink>

                            <NavLink
                                to={{ pathname: "/auth", hash: "register" }}
                                className="text-white py-2 font-bold border-indigo-500/30 grow-0 shrink basis-24 text-center shimmer"
                            >
                                Register
                            </NavLink>
                        </div>
                    }
                </section>
            </header>

            <section>
                <h1 className="font-bold text-2xl leading-tight text-white pl-8 pt-8">
                    insert cool homepage here
                </h1>
            </section>
        </>
    );
}