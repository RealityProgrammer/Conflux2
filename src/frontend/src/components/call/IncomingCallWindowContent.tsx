import {type IncomingDirectCall, useCallStore} from "../../store/useCallStore.ts";
import CallWindowHeader from "./CallWindowHeader.tsx";
import UserAvatar from "../UserAvatar.tsx";
import IconButton from "../IconButton.tsx";
import {BsTelephoneInboundFill, BsTelephoneXFill} from "react-icons/bs";
import {userService} from "../../api/userService.ts";
import {useSignalR} from "../../contexts/SignalRContext.tsx";
import {useEffect, useRef, useState} from "react";
import {createTimeline} from "animejs";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {DirectCallCanceledEvent} from "../../api/events.ts";

export default function IncomingCallWindowContent({call}: {call: IncomingDirectCall}) {
  if (call.state === "incoming") {
    return <IncomingPhase call={call}/>
  }

  return null;
}

function IncomingPhase({call}: {call: IncomingDirectCall}) {
  const markCallAsConnected = useCallStore((state) => state.markCallAsConnected);
  const endCall = useCallStore((state) => state.endCall);
  const { invokeSafely } = useSignalR();
  const [status, setStatus] = useState<"none" | "canceled" | "denied">("none");

  const handleDeclineCall = async () => {
    if (status !== "none") return;
    setStatus("denied");

    try {
      await invokeSafely("DenyDirectCall", call.callerProfile.id);
    } catch (err) {
      console.error("Failed to deny call:", err);
    }
  };

  const handleAcceptCall = async () => {
    if (status !== "none") return;
    try {
      await invokeSafely("AcceptDirectCall", call.callerProfile.id);
      markCallAsConnected(call.sessionId);
    } catch (err) {
      console.error("Failed to accept call:", err);
    }
  }

  useEffect(() => {
    if (status !== "none") {
      const timeoutId = setTimeout(() => {
        endCall(call.sessionId);
      }, 3000);

      return () => {
        clearTimeout(timeoutId);
      }
    }
  }, [status]);

  const callerAvatarRef = useRef<HTMLDivElement | null>(null);
  const rippleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!callerAvatarRef.current || !rippleRef.current || status !== "none") return;

    const timeline = createTimeline({
      loop: true,
      loopDelay: 1000,
    });

    timeline.add(callerAvatarRef.current, {
      scale: 0.8,
      ease: "inQuart",
      duration: 600,
    });

    timeline.add(rippleRef.current, {
      scale: 2,
      borderWidth: "25px",
      ease: "linear",
      duration: 500,
    }, 600);

    timeline.add(rippleRef.current, {
      opacity: 0,
      ease: "linear",
      duration: 400,
    }, 700);

    timeline.add(callerAvatarRef.current, {
      scale: 1,
      ease: "outQuart",
      duration: 600,
    }, 600);

    return () => {
      timeline.cancel();
    }
  }, [status]);

  useSignalREvent("DirectCallCanceled", (event: DirectCallCanceledEvent) => {
    if (call.callerProfile.id === event.callerUserId) {
      setStatus("canceled");
    }
  });

  return (
    <>
      <CallWindowHeader title={status === "none" ? (
        `Incoming call from ${call.callerProfile.displayName}`
      ) : status === "canceled" ? (
        "Call canceled"
      ) : status === "denied" ? (
        "Call denied"
      ) : null}/>

      <section className="flex-1 bg-black flex flex-col justify-center items-center gap-2 @container-size relative overflow-hidden">
        <UserAvatar
          ref={callerAvatarRef}
          src={call.callerProfile.avatarRevision ? userService.getAvatarUrl(call.callerProfile.id, call.callerProfile.avatarRevision) : undefined}
          alt="Caller avatar"
          className="w-[min(25cqw,25cqh)]"
          style={{ transform: "scale(1)"}}
        />

        {status === "none" && (
          <div
            ref={rippleRef}
            className="absolute size-64 bg-none border-white/45 rounded-full"
            style={{ transform: "scale(0)", opacity: 1, borderWidth: 0 }}
          ></div>
        )}

        <p className="text-sm select-none">{call.callerProfile.displayName}</p>

        {status === "none" && (
          <div className="absolute bottom-2 flex flex-row gap-4 p-2 bg-gray-650 border-2 border-gray-600 rounded-lg">
            <IconButton className="size-8" theme="danger" onClick={handleDeclineCall} disabled={status !== "none"}>
              <BsTelephoneXFill className="size-8"/>
            </IconButton>

            <IconButton className="size-8" theme="success" onClick={handleAcceptCall} disabled={status !== "none"}>
              <BsTelephoneInboundFill className="size-8"/>
            </IconButton>
          </div>
        )}
      </section>
    </>
  )
}