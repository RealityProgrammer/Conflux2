import {type OutgoingDirectCall, useCallStore} from "../../store/useCallStore.ts";
import CallWindowHeader from "./CallWindowHeader.tsx";
import {useSignalR} from "../../contexts/SignalRContext.tsx";
import UserAvatar from "../UserAvatar.tsx";
import {useAuth} from "../../contexts/AuthContext.tsx";
import {userService} from "../../api/userService.ts";
import IconButton from "../IconButton.tsx";
import {BsCameraVideoOffFill, BsTelephoneFill, BsTelephoneXFill} from "react-icons/bs";
import {useTimeout} from "usehooks-ts";
import {useEffect, useRef, useState} from "react";
import {animate} from "animejs";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {
  DirectCallAcceptedEvent,
  DirectCallDeniedEvent,
  DirectCallDroppedEvent,
  DirectCallEndedEvent
} from "../../api/events.ts";
import type {DirectCallContext} from "../../api/types.ts";
import useUserMedia from "../../hooks/useUserMedia.ts";
import Spinner from "../Spinner.tsx";
import useWebRTC from "../../hooks/useWebRTC.ts";
import MediaFeed from "./MediaFeed.tsx";

export default function OutgoingCallWindowContent({call}: {call: OutgoingDirectCall}) {
  const markCallAsDropped = useCallStore((state) => state.markCallAsDropped);
  const markCallAsEnded = useCallStore((state) => state.markCallAsEnded);

  useSignalREvent("DirectCallDropped", (event: DirectCallDroppedEvent) => {
    if (call.calleeProfile.id === event.droppedUserId) {
      markCallAsDropped(call.sessionId);
    }
  });

  useSignalREvent("DirectCallEnded", (event: DirectCallEndedEvent) => {
    if (call.calleeProfile.id === event.enderUserId) {
      markCallAsEnded(call.sessionId);
    }
  });

  if (!call) return null;

  if (call.state === "dialing") {
    return <DialingPhase call={call}/>;
  }

  if (call.state === "dropped") {
    return <DroppedPhase call={call}/>
  }

  if (call.state === "active") {
    return <ActivePhase call={call}/>
  }

  if (call.state === "ended") {
    return <EndedPhase call={call}/>
  }

  return null;
}

function DialingPhase({call}: {call: OutgoingDirectCall}) {
  const { userProfile } = useAuth();
  const markCallAsActive = useCallStore((state) => state.markCallAsActive);
  const endCall = useCallStore((state) => state.endCall);
  const { invokeSafely } = useSignalR();

  const [status, setStatus] = useState<"none" | "cancel" | "no_answer" | "denied">("none");

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

  useSignalREvent("DirectCallAccepted", (event: DirectCallAcceptedEvent) => {
    if (call.calleeProfile.id === event.calleeUserId) {
      markCallAsActive(call.sessionId);
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
              <BsTelephoneXFill className="size-7"/>
            </IconButton>
          </div>
        )}
      </div>
    </>
  );
}

function DroppedPhase({call}: {call: OutgoingDirectCall}) {
  const endCall = useCallStore((state) => state.endCall);

  useTimeout(() => {
    endCall(call.sessionId);
  }, 5000);

  return (
    <>
      <CallWindowHeader title="Call dropped"/>

      <div className="flex-1 bg-black @container-size flex flex-col justify-center items-center">
        <UserAvatar
          src={call.calleeProfile.avatarRevision ? userService.getAvatarUrl(call.calleeProfile.id, call.calleeProfile.avatarRevision) : undefined}
          alt="Callee avatar"
          className="w-[min(25cqw,25cqh)]"
        />
      </div>
    </>
  )
}

function ActivePhase({call}: {call: OutgoingDirectCall}) {
  const { userProfile } = useAuth();
  const { invokeSafely } = useSignalR();
  const markCallAsEnded = useCallStore((state) => state.markCallAsEnded);
  const [isEndingCall, setIsEndingCall] = useState(false);

  const {
    stream,
    isAcquiringMedia,
  } = useUserMedia({});

  const calleeId = call.calleeProfile.id;

  const { remoteStreams, connectToPeer } = useWebRTC({ localStream: stream });
  const remoteStream = remoteStreams[calleeId];

  // initialize webrtc offer when stream
  useEffect(() => {
    if (stream && calleeId) {
      connectToPeer(calleeId);
    }
  }, [stream, calleeId, connectToPeer]);

  const handleCallEnd = async () => {
    setIsEndingCall(true);

    try {
      const result: DirectCallContext = await invokeSafely("EndDirectCall", calleeId);

      if (result && result.result.isSuccess) {
        markCallAsEnded(call.sessionId);
      } else {
        setIsEndingCall(false);
      }
    } catch (err) {
      console.error("Failed to end call:", err);
      setIsEndingCall(false);
    }
  };

  return (
    <>
      <CallWindowHeader title={`On call with ${call.calleeProfile!.displayName}`}/>

      <div className="flex-1 bg-black @container-size relative flex flex-col justify-center items-center">
        {/* Local video */}
        <div className="z-10 absolute top-2 left-2 w-48 aspect-video ring-2 ring-gray-600 rounded-lg bg-gray-900 overflow-hidden flex flex-col justify-center items-center">
          {isAcquiringMedia ? (
            <Spinner className="size-8 fill-white"/>
          ) : (
            <MediaFeed
              stream={stream}
              isLocal
              avatarUrl={userProfile?.avatarRevision ? userService.getAvatarUrl(userProfile.id, userProfile.avatarRevision) : undefined}
              className="size-full"
            />
          )}
        </div>

        {/* Remote video */}
        <MediaFeed
          stream={remoteStream}
          avatarUrl={call.calleeProfile.avatarRevision ? userService.getAvatarUrl(call.calleeProfile.id, call.calleeProfile.avatarRevision) : undefined}
          displayName={call.calleeProfile.displayName ?? "???"}
          className="object-contain size-full"
        />

        <div className="absolute left-1/2 bottom-2 -translate-x-1/2 flex flex-row gap-4 p-2 bg-gray-650 border-2 border-gray-600 rounded-lg">
          <IconButton isLoading={false} theme="danger" disabled={isEndingCall} onClick={handleCallEnd}>
            <BsTelephoneXFill className="size-7"/>
          </IconButton>
        </div>
      </div>
    </>
  );
}

function EndedPhase({call}: {call: OutgoingDirectCall}) {
  const endCall = useCallStore((state) => state.endCall);

  useTimeout(() => {
    endCall(call.sessionId);
  }, 5000);

  return (
    <>
      <CallWindowHeader title="Call ended"/>

      <div className="flex-1 bg-black @container-size flex flex-col justify-center items-center">
        <UserAvatar
          src={call.calleeProfile.avatarRevision ? userService.getAvatarUrl(call.calleeProfile.id, call.calleeProfile.avatarRevision) : undefined}
          alt="Callee avatar"
          className="w-[min(25cqw,25cqh)]"
        />
      </div>
    </>
  )
}