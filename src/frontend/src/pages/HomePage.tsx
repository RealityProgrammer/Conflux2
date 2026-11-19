import Logo from "../components/Logo.tsx";
import { useAuth } from "../contexts/AuthContext.tsx";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { animate } from "animejs";
import { BsDoorClosed, BsDoorOpen, BsGear } from "react-icons/bs";
import { NavLink } from "react-router";
import { useDocumentTitle } from "usehooks-ts";

function AuthenticatedNavigationDrawer({ userName, logout }: { userName: string; logout: () => void }) {
  const [open, setOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open && contentRef.current && overlayRef.current) {
      animate(contentRef.current, {
        translateX: "0%",
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
      translateX: "100%",
      duration: 300,
    });

    animate(overlayRef.current, {
      opacity: 0,
      duration: 300,
      onComplete: () => {
        setOpen(false);
      },
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(state) => {
        if (state) {
          setOpen(true);
        } else {
          handleClose();
        }
      }}
    >
      <Dialog.Trigger asChild>
        <button className="hover-highlight float-end inline-flex cursor-pointer flex-row items-center justify-end gap-1 rounded-full bg-transparent p-2 text-white">
          {userName}
        </button>
      </Dialog.Trigger>

      <Dialog.Portal forceMount>
        {open && (
          <>
            <Dialog.Overlay
              ref={overlayRef}
              className="backdrop-overlay backdrop-blur-sm"
              style={{ opacity: 0 }}
            />

            <Dialog.Content
              ref={contentRef}
              className="fixed top-0 right-0 h-full w-2/3 overflow-hidden border-l-2 border-l-[#353535] bg-[#071318] p-5 sm:w-1/2 md:w-1/3"
              style={{ transform: "translateX(100%)" }}
              onEscapeKeyDown={(e) => {
                e.preventDefault();
                handleClose();
              }}
              onPointerDownOutside={(e) => {
                e.preventDefault();
                handleClose();
              }}
            >
              <Dialog.Title className="m-0 font-medium text-white">Select your destination</Dialog.Title>
              <Dialog.Description className="mt-3 mb-5 text-sm text-gray-400">
                Where are we going next?
              </Dialog.Description>

              <div className="flex flex-col gap-2">
                <NavLink
                  className="shimmer group flex w-full flex-none flex-row items-center justify-center gap-3 rounded-full border-2 border-indigo-500/30 px-7 py-2 font-bold text-white"
                  to="/lobby/me"
                >
                  <BsDoorClosed className="block size-5 flex-none fill-white group-hover:hidden" />
                  <BsDoorOpen className="hidden size-5 flex-none fill-white group-hover:block" />
                  Lobby
                </NavLink>

                <NavLink
                  className="shimmer flex w-full flex-none flex-row items-center justify-center gap-3 rounded-full border-2 border-indigo-500/30 px-7 py-2 font-bold text-white"
                  to="/settings/account"
                >
                  <BsGear className="size-5 flex-none fill-white" />
                  Settings
                </NavLink>

                <button
                  className="flex w-full flex-none cursor-pointer flex-row items-center justify-center gap-3 rounded-full border-2 border-red-600 px-7 py-2 font-bold text-red-700"
                  onClick={logout}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-5 flex-none fill-red-700"
                    viewBox="0 0 16 16"
                  >
                    <path d="M8.5 10c-.276 0-.5-.448-.5-1s.224-1 .5-1 .5.448.5 1-.224 1-.5 1" />
                    <path d="M10.828.122A.5.5 0 0 1 11 .5V1h.5A1.5 1.5 0 0 1 13 2.5V15h1.5a.5.5 0 0 1 0 1h-13a.5.5 0 0 1 0-1H3V1.5a.5.5 0 0 1 .43-.495l7-1a.5.5 0 0 1 .398.117M11.5 2H11v13h1V2.5a.5.5 0 0 0-.5-.5M4 1.934V15h6V1.077z" />
                  </svg>
                  Logout
                </button>
              </div>
            </Dialog.Content>
          </>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function HomePage() {
  useDocumentTitle("Conflux");

  const auth = useAuth();

  return (
    <>
      <div className="fixed inset-0 z-[-1] bg-gray-900"></div>

      <header className="flex w-full flex-row items-center border-b-2 border-b-[#353535] bg-[#071318] px-6 py-2">
        <section className="inline-flex flex-none flex-row items-center justify-start gap-4">
          <Logo className="size-14" />
        </section>

        <nav className="flex flex-4 flex-row justify-center gap-2 overflow-y-auto px-6">
          <NavLink
            className="shimmer flex-none rounded-full border-2 border-indigo-500/30 px-7 py-2 font-bold text-white"
            to="#"
          >
            Home
          </NavLink>

          <NavLink
            className="shimmer flex-none rounded-full border-2 border-indigo-500/30 px-7 py-2 font-bold text-white"
            to="#"
          >
            Safety
          </NavLink>

          <NavLink
            className="shimmer flex-none rounded-full border-2 border-indigo-500/30 px-7 py-2 font-bold text-white"
            to="#"
          >
            Blog
          </NavLink>

          <NavLink
            className="shimmer flex-none rounded-full border-2 border-indigo-500/30 px-7 py-2 font-bold text-white"
            to="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          >
            Download
          </NavLink>

          <NavLink
            className="shimmer flex-none rounded-full border-2 border-indigo-500/30 px-7 py-2 font-bold text-white"
            to="#"
          >
            About
          </NavLink>
        </nav>

        <section className="flex flex-1 flex-row justify-end">
          {auth.userAuthorization ? (
            <AuthenticatedNavigationDrawer
              userName={auth.userProfile?.userName ?? "Unknown User"}
              logout={auth.logout}
            />
          ) : (
            <div className="button-group flex-auto justify-end">
              <NavLink
                to={{ pathname: "/auth", hash: "login" }}
                className="shimmer shrink grow-0 basis-24 border-indigo-500/30 py-2 text-center font-bold text-white"
              >
                Login
              </NavLink>

              <NavLink
                to={{ pathname: "/auth", hash: "register" }}
                className="shimmer shrink grow-0 basis-24 border-indigo-500/30 py-2 text-center font-bold text-white"
              >
                Register
              </NavLink>
            </div>
          )}
        </section>
      </header>

      <section>
        <h1 className="pt-8 pl-8 text-2xl leading-tight font-bold text-white">insert cool homepage here</h1>
      </section>
    </>
  );
}
