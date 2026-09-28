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
import type {DirectCallCanceledEvent, DirectCallDroppedEvent} from "../../api/events.ts";
import Webcam from "react-webcam";
import {useTimeout} from "usehooks-ts";

export default function IncomingCallWindowContent({call}: {call: IncomingDirectCall}) {
  const markCallAsDropped = useCallStore((state) => state.markCallAsDropped);

  useSignalREvent("DirectCallDropped", (event: DirectCallDroppedEvent) => {
    console.log("call dropped");

    if (call.callerProfile.id === event.droppedUserId) {
      markCallAsDropped(call.sessionId);
    }
  });

  if (call.state === "incoming") {
    return <IncomingPhase call={call}/>
  }

  if (call.state === "dropped") {
    return <DroppedPhase call={call}/>
  }

  if (call.state === "active") {
    return <ActivePhase call={call}/>
  }

  return null;
}

function IncomingPhase({call}: {call: IncomingDirectCall}) {
  const markCallAsActive = useCallStore((state) => state.markCallAsActive);
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
      markCallAsActive(call.sessionId);
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

function DroppedPhase({call}: {call: IncomingDirectCall}) {
  const endCall = useCallStore((state) => state.endCall);

  useTimeout(() => {
    endCall(call.sessionId);
  }, 5000);

  return (
    <>
      <CallWindowHeader title="Call dropped"/>

      <div className="flex-1 bg-black @container-size flex flex-col justify-center items-center">
        <UserAvatar
          src={call.callerProfile.avatarRevision ? userService.getAvatarUrl(call.callerProfile.id, call.callerProfile.avatarRevision) : undefined}
          alt="Caller avatar"
          className="w-[min(25cqw,25cqh)]"
          style={{ transform: "scale(1)"}}
        />
      </div>
    </>
  )
}

function ActivePhase({call}: {call: IncomingDirectCall}) {
  const webcamRef = useRef<Webcam>(null);

  return (
    <>
      <CallWindowHeader title={`On call with ${call.callerProfile!.displayName}`}/>

      <div className="flex-1 bg-black @container-size relative flex flex-col justify-center items-center">
        <Webcam
          ref={webcamRef}
          audio={true}
          width={1280}
          height={720}
          className="object-contain size-full -scale-x-100"
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user"
          }}
        />

        <div className="absolute left-1/2 bottom-2 -translate-x-1/2 flex flex-row gap-4 p-2 bg-gray-650 border-2 border-gray-600 rounded-lg">
          <IconButton isLoading={false} theme="danger">
            <BsTelephoneXFill className="size-8"/>
          </IconButton>
        </div>
      </div>
    </>
  );
}