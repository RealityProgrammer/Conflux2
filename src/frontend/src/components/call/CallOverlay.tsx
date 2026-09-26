import {useCallStore} from "../../store/useCallStore.ts";
import interact from "interactjs";
import type {ResizeEvent} from "@interactjs/actions/resize/plugin";
import type {InteractEvent} from "@interactjs/core/InteractEvent";
import {useEffect, useRef} from "react";
import IconButton from "../IconButton.tsx";
import {FaExpand, FaMinus} from "react-icons/fa6";
import Spinner from "../Spinner.tsx";
import {BsExclamationTriangle, BsTelephoneFill, BsTelephoneXFill} from "react-icons/bs";
import UserAvatar from "../UserAvatar.tsx";
import {userService} from "../../api/userService.ts";
import {useSignalR} from "../../contexts/SignalRContext.tsx";
import {CallResult, type DirectCallContext} from "../../api/types.ts";
import {useAuth} from "../../contexts/AuthContext.tsx";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {IncomingDirectCallEvent} from "../../api/events.ts";
import CallWindow from "./CallWindow.tsx";

export default function CallOverlay() {
  const calls = useCallStore((state) => state.calls);
  const startIncomingDirectCall = useCallStore((state) => state.startIncomingDirectCall);

  useSignalREvent("IncomingDirectCall", (event: IncomingDirectCallEvent) => {
    startIncomingDirectCall(event.callerProfile);
  });

  return (
    <section className="fixed inset-0 z-100000 pointer-events-none overflow-hidden text-white">
      {calls.map((call) => (
        <CallWindow key={call.sessionId} callSessionId={call.sessionId}/>
      ))}
    </section>
  )
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