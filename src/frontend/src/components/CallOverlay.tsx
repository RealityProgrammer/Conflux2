import {useCallStore} from "../store/useCallStore.ts";
import interact from "interactjs";
import type {ResizeEvent} from "@interactjs/actions/resize/plugin";
import type {InteractEvent} from "@interactjs/core/InteractEvent";
import {useEffect, useRef} from "react";
import IconButton from "./IconButton.tsx";
import {FaExpand, FaMinus} from "react-icons/fa6";
import Spinner from "./Spinner.tsx";
import {BsExclamationTriangle, BsTelephoneFill, BsTelephoneXFill} from "react-icons/bs";
import {useGetUserIdentityProfileQuery} from "../graphql/queries.ts";
import UserAvatar from "./UserAvatar.tsx";
import {useAuth} from "../contexts/AuthContext.tsx";
import {userService} from "../api/userService.ts";

export default function CallOverlay() {
  const calls = useCallStore((state) => state.calls);

  return (
    <section className="fixed inset-0 z-100000 pointer-events-none overflow-hidden">
      {calls.map((call) => (
        <CallWindow key={call.sessionId} callSessionId={call.sessionId}/>
      ))}
    </section>
  )
}

let highestZIndex = 1;

function CallWindow({
  callSessionId
}: {callSessionId: string}) {
  const windowRef = useRef<HTMLDivElement>(null);

  const bringToFront = () => {
    if (windowRef.current) {
      highestZIndex += 1;
      windowRef.current.style.zIndex = String(highestZIndex);
    }
  };

  useEffect(() => {
    const element = windowRef.current;
    if (!element) return;

    bringToFront();

    const interactable = interact(element)
      .resizable({
        edges: { left: true, right: true, bottom: true, top: false },

        listeners: {
          move: (event: ResizeEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            let x: number = (parseFloat(target.getAttribute('data-x') || "0") || 0);
            let y: number = (parseFloat(target.getAttribute('data-y') || "0") || 0);

            target.style.width = event.rect.width + 'px';
            target.style.height = event.rect.height + 'px';

            x += event.deltaRect?.left ?? 0;
            y += event.deltaRect?.top ?? 0;

            target.style.transform = 'translate(' + x + 'px,' + y + 'px)';

            target.setAttribute('data-x', String(x));
            target.setAttribute('data-y', String(y));
          },
        },
      })
      .draggable({
        allowFrom: '.drag-handle',
        inertia: true,
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: "parent",
            endOnly: true,
          }),
        ],
        autoScroll: true,
        listeners: {
          move: (event: InteractEvent) => {
            const target = event.target as HTMLElement | null;
            if (!target) return;

            const x: number = (parseFloat(target.getAttribute("data-x") || "0") || 0) + event.dx;
            const y: number = (parseFloat(target.getAttribute('data-y') || "0") || 0) + event.dy;

            target.style.transform = 'translate(' + x + 'px, ' + y + 'px)';

            target.setAttribute('data-x', String(x));
            target.setAttribute('data-y', String(y));
          },
        }
      });

    return () => {
      interactable.unset();
    };
  }, []);

  return (
    <div
      ref={windowRef}
      onPointerDown={bringToFront}
      className="pointer-events-auto absolute bg-gray-750 shadow-md border-2 border-gray-600 rounded-lg overflow-hidden flex flex-col"
      style={{
        width: "400px",
        height: "225px",
      }}
    >
      <CallWindowContent callSessionId={callSessionId}/>
    </div>
  )
}

function CallWindowContent({callSessionId}: {callSessionId: string}) {
  const { userProfile } = useAuth();
  const updateCallState = useCallStore((state) => state.updateCallState);
  const endCall = useCallStore((state) => state.endCall);

  const calls = useCallStore((state) => state.calls);

  const call = calls.find((c) => c.sessionId === callSessionId);

  const { data: directCallCalleeInfo, isLoading, isError, isSuccess } = useGetUserIdentityProfileQuery(
    { id: call?.type === "direct" ? call.calleeId : "" },
    {
      enabled: call?.type === "direct",
      staleTime: Infinity,
    },
  );

  useEffect(() => {
    if (call && call.state === "init") {
      if (isSuccess && directCallCalleeInfo) {
        updateCallState(call.sessionId, "dialing");
      } else if (isError) {
        updateCallState(call.sessionId, "init_error");
      }
    }
  }, [callSessionId, call, directCallCalleeInfo, updateCallState, isLoading, isError, isSuccess]);

  const handleEndCall = () => {
    endCall(callSessionId);
  };

  return (
    <>
      <header
        className="drag-handle bg-gray-775 px-3 py-2 flex flex-row justify-between items-center select-none border-b-2 border-gray-600"
      >
        <span className="flex-1 text-gray-200 text-sm font-semibold truncate pointer-events-none animate-pulse">
          { !call ? (
            <span>Can't find the right call...</span>
          ) : call.state === "init" ? (
            <span className="animate-pulse">Initializing...</span>
          ) : call.state === "init_error" ? (
            "Something happened..."
          ) : call.state === "dialing" ? (
            `Dialing ${directCallCalleeInfo?.user!.displayName}...`
          ) : (
            "Insert title here"
          )}
        </span>

        <div className="flex-none flex gap-3 pointer-events-auto cursor-default">
          <IconButton theme="default">
            <FaMinus className="size-4"/>
          </IconButton>

          <IconButton theme="default">
            <FaExpand className="size-4"/>
          </IconButton>

          <IconButton theme="danger" onClick={handleEndCall}>
            <BsTelephoneXFill className="size-4"/>
          </IconButton>
        </div>
      </header>

      <section className="flex-1 bg-black relative">
        {call && (call.state === "init" ? (
          <div className="size-full flex flex-col justify-center items-center">
            <Spinner className="size-12 fill-white"/>
          </div>
        ) : call.state === "init_error" ? (
          <div className="size-full flex flex-col justify-center items-center gap-3">
            <BsExclamationTriangle className="size-12 fill-white"/>
            <p>Failed to load callee information.</p>
          </div>
        ) : call.state === "dialing" ? (
          <DialingScene
            callerAvatarSrc={userProfile?.avatarRevision ? userService.getAvatarUrl(userProfile.id, userProfile.avatarRevision) : undefined}
            calleeAvatarSrc={directCallCalleeInfo?.user?.avatarRevision ? userService.getAvatarUrl(directCallCalleeInfo.user.id, directCallCalleeInfo.user.avatarRevision) : undefined}
          />
        ) : (
            <p>state: {call.state}</p>
        ))}
      </section>
    </>
  );
}

function DialingScene({
  callerAvatarSrc,
  calleeAvatarSrc
}: {callerAvatarSrc: string | undefined, calleeAvatarSrc: string | undefined}) {
  return (
    <div className="size-full p-6 @container-size">
      <div className="size-full flex flex-row justify-center items-center gap-[10%]">
        <UserAvatar
          src={callerAvatarSrc}
          alt="Caller avatar"
          className="w-[min(calc(50cqw-0.75rem),50cqh)] border-2 border-gray-600"
        />

        <BsTelephoneFill className="size-24 fill-white animate-pulse"/>

        <UserAvatar
          src={calleeAvatarSrc}
          alt="Callee avatar"
          className="w-[min(calc(50cqw-0.75rem),50cqh)] border-2 border-gray-600"
        />
      </div>
    </div>
  );
}