import {type OutgoingDirectCall, useCallStore} from "../../store/useCallStore.ts";
import CallWindowHeader from "./CallWindowHeader.tsx";
import {useSignalR} from "../../contexts/SignalRContext.tsx";
import UserAvatar from "../UserAvatar.tsx";
import {useAuth} from "../../contexts/AuthContext.tsx";
import {userService} from "../../api/userService.ts";
import IconButton from "../IconButton.tsx";
import {BsTelephoneFill, BsTelephoneXFill} from "react-icons/bs";
import {useTimeout} from "usehooks-ts";
import {useEffect, useRef, useState} from "react";
import {animate} from "animejs";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {DirectCallDeniedEvent, DirectCallDroppedEvent} from "../../api/events.ts";

export default function OutgoingCallWindowContent({call}: {call: OutgoingDirectCall}) {
  if (!call) return null;

  if (call.state === "dialing") {
    return <DialingPhase call={call}/>;
  }

  return null;
}

function DialingPhase({call}: {call: OutgoingDirectCall}) {
  const { userProfile } = useAuth();
  const endCall = useCallStore((state) => state.endCall);
  const { invokeSafely } = useSignalR();

  const [status, setStatus] = useState<"none" | "cancel" | "no_answer" | "denied" | "dropped">("none");

  const handleCancelCall = async () => {
    try {
      await invokeSafely("CancelDirectCall", call.calleeProfile.id);
      setStatus("cancel");
    } catch (err) {
      console.error("Failed to cancel call:", err);
    }
  };

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

  useTimeout(() => {
    if (status === "none") {
      setStatus("no_answer");

      (async () => {
        try {
          await invokeSafely("CancelDirectCall", call.calleeProfile.id);
        } catch (err) {
          console.error("Failed to cancel call:", err);
        }
      })();
    }
  }, 60000);

  const calleeAvatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calleeAvatarRef.current || status !== "none") return;

    const animation = animate(calleeAvatarRef.current, {
      rotate: [
        {to: "5deg", ease: "inOut"},
        {to: "-5deg", ease: "inOut"},
        {to: "0deg", ease: "inOut"},
      ],
      loop: true,
      duration: 500,
      loopDelay: 500,
    });

    return () => {
      animation.cancel();
    };
  }, [status]);

  useSignalREvent("DirectCallDenied", (event: DirectCallDeniedEvent) => {
    if (call.calleeProfile.id === event.calleeUserId) {
      setStatus("denied");
    }
  });

  useSignalREvent("DirectCallDropped", (event: DirectCallDroppedEvent) => {
    if (call.calleeProfile.id === event.droppedUserId) {
      setStatus("dropped");
    }
  });

  return (
    <>
      <CallWindowHeader title={
        status === "none" ? (
          `Dialing ${call.calleeProfile!.displayName}`
        ) : status === "cancel" ? (
          "Call canceled"
        ) : status === "denied" ? (
          "Call denied"
        ) : (
          "But nobody came..."
        )
      }/>

      <div className="flex-1 bg-black p-6 @container-size relative flex flex-col justify-center items-center">
        <div className="size-full flex flex-row justify-center items-center gap-[10%]">
          <UserAvatar
            src={userProfile?.avatarRevision ? userService.getAvatarUrl(userProfile.id, userProfile.avatarRevision) : undefined}
            alt="Caller avatar"
            className="w-[min(calc(50cqw-0.75rem),50cqh)] border-2 border-gray-600"
          />

          {status === "none" ? (
            <BsTelephoneFill className="size-[min(calc(25cqw),25cqh)]"/>
          ) : (
            <BsTelephoneXFill className="size-[min(calc(25cqw),25cqh)] fill-red-400"/>
          )}

          <UserAvatar
            ref={calleeAvatarRef}
            src={call.calleeProfile?.avatarRevision ? userService.getAvatarUrl(call.calleeProfile.id, call.calleeProfile.avatarRevision) : undefined}
            alt="Callee avatar"
            className="w-[min(calc(50cqw-0.75rem),50cqh)] border-2 border-gray-600"
          />
        </div>

        {status === "none" && (
          <div className="absolute bottom-2 flex flex-row gap-4 p-2 bg-gray-650 border-2 border-gray-600 rounded-lg">
            <IconButton isLoading={false} theme="danger" onClick={handleCancelCall}>
              <BsTelephoneXFill className="size-8"/>
            </IconButton>
          </div>
        )}
      </div>
    </>
  );
}