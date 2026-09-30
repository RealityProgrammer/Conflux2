import {type IncomingDirectCall, useCallStore} from "../../store/useCallStore.ts";
import CallWindowHeader from "./CallWindowHeader.tsx";
import UserAvatar from "../UserAvatar.tsx";
import IconButton from "../IconButton.tsx";
import {BsCameraVideoOffFill, BsTelephoneInboundFill, BsTelephoneXFill} from "react-icons/bs";
import {userService} from "../../api/userService.ts";
import {useSignalR} from "../../contexts/SignalRContext.tsx";
import {useEffect, useRef, useState} from "react";
import {createTimeline} from "animejs";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {DirectCallCanceledEvent, DirectCallDroppedEvent, DirectCallEndedEvent} from "../../api/events.ts";
import {useTimeout} from "usehooks-ts";
import type {DirectCallContext} from "../../api/types.ts";
import useUserMedia from "../../hooks/useUserMedia.ts";
import Spinner from "../Spinner.tsx";
import {useAuth} from "../../contexts/AuthContext.tsx";
import useWebRTC from "../../hooks/useWebRTC.ts";
import MediaFeed from "./MediaFeed.tsx";
import CallControl from "./CallControl.tsx";
import {toast} from "react-toastify";

export default function IncomingCallWindowContent({call}: {call: IncomingDirectCall}) {
  const markCallAsDropped = useCallStore((state) => state.markCallAsDropped);
  const markCallAsEnded = useCallStore((state) => state.markCallAsEnded);

  useSignalREvent("DirectCallDropped", (event: DirectCallDroppedEvent) => {
    if (call.callerProfile.id === event.droppedUserId) {
      markCallAsDropped(call.sessionId);
    }
  });

  useSignalREvent("DirectCallEnded", (event: DirectCallEndedEvent) => {
    if (call.callerProfile.id === event.enderUserId) {
      markCallAsEnded(call.sessionId);
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

  if (call.state === "ended") {
    return <EndedPhase call={call}/>
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
      const context: DirectCallContext = await invokeSafely("DenyDirectCall", call.callerProfile.id);

      if (!context) {
        toast.error(`Failed to deny call.`);
      } else if (!context.result.isSuccess) {
        toast.error(`Failed to deny call (${context.result.error.code}).`);
      }
    } catch (err) {
      console.error("Failed to deny call:", err);
      toast.error(`Failed to deny call.`);
    }
  };

  const handleAcceptCall = async () => {
    if (status !== "none") return;
    try {
      const context: DirectCallContext =  await invokeSafely("AcceptDirectCall", call.callerProfile.id);

      if (context) {
        if (context.result.isSuccess) {
          markCallAsActive(call.sessionId);
        } else {
          toast.error(`Failed to accept call (${context.result.error.code}).`);
        }
      } else {
        toast.error(`Failed to accept call.`);
      }
    } catch (err) {
      console.error("Failed to accept call:", err);
      toast.error(`Failed to accept call.`);
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
              <BsTelephoneXFill className="size-7"/>
            </IconButton>

            <IconButton className="size-8" theme="success" onClick={handleAcceptCall} disabled={status !== "none"}>
              <BsTelephoneInboundFill className="size-7"/>
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
        />
      </div>
    </>
  )
}

function ActivePhase({call}: {call: IncomingDirectCall}) {
  const { userProfile } = useAuth();
  const { invokeSafely } = useSignalR();
  const markCallAsEnded = useCallStore((state) => state.markCallAsEnded);
  const [isEndingCall, setIsEndingCall] = useState(false);

  const {
    stream,
    isAcquiringMedia,
    isAudioMuted,
    toggleAudio,
    isVideoDisabled,
    toggleVideo,
    selectedVideoInputId,
    videoDevices,
    changeVideoInputDevice,
    selectedAudioInputId,
    audioInputDevices,
    changeAudioInputDevice,
    audioOutputDevices,
  } = useUserMedia({});

  const [selectedAudioDeviceOutputId, setSelectedAudioDeviceOutputId] = useState<string | undefined>();

  useEffect(() => {
    if (!selectedAudioDeviceOutputId && audioOutputDevices.length > 0) {
      const defaultDevice = audioOutputDevices.find(d => d.deviceId === "default");
      const initialId = defaultDevice?.deviceId ?? audioOutputDevices[0].deviceId;

      setSelectedAudioDeviceOutputId(initialId);
    }
  }, [audioOutputDevices, selectedAudioDeviceOutputId]);

  const callerId = call.callerProfile.id;

  const { remoteStreams, remoteMediaStates } = useWebRTC({
    localStream: stream,
    isAudioMuted,
    isVideoDisabled,
  });
  const remoteStream = remoteStreams[callerId];
  const remoteState = remoteMediaStates[callerId] || { videoDisabled: false, audioMuted: false };

  const handleCallEnd = async () => {
    setIsEndingCall(true);

    try {
      const context: DirectCallContext = await invokeSafely("EndDirectCall", callerId);

      if (context) {
        if (context.result.isSuccess) {
          markCallAsEnded(call.sessionId);
        } else {
          toast.error(`Failed to end call. Reason: ${context.result.error.code}.`);
        }
      } else {
        setIsEndingCall(false);
        toast.error(`Failed to end call.`);
      }
    } catch (err) {
      console.error("Failed to end call:", err);
      toast.error("Failed to end call.");
      setIsEndingCall(false);
    }
  };

  return (
    <>
      <CallWindowHeader title={`On call with ${call.callerProfile!.displayName}`}/>

      <div className="flex-1 bg-black @container-size relative flex flex-col justify-center items-center">
        {/*Local video */}
        <div className="z-10 absolute top-2 left-2 w-48 aspect-video ring-2 ring-gray-600 rounded-lg bg-gray-900 overflow-hidden flex flex-col justify-center items-center">
          {isAcquiringMedia ? (
            <Spinner className="size-8 fill-white"/>
          ) : (
            <MediaFeed
              stream={stream}
              isLocal
              avatarUrl={userProfile?.avatarRevision ? userService.getAvatarUrl(userProfile.id, userProfile.avatarRevision) : undefined}
              isVideoEnabled={!isVideoDisabled}
            />
          )}
        </div>

        {/* Remote video */}
        <MediaFeed
          stream={remoteStream}
          avatarUrl={call.callerProfile.avatarRevision ? userService.getAvatarUrl(callerId, call.callerProfile.avatarRevision) : undefined}
          displayName={call.callerProfile.displayName ?? "???"}
          className="object-contain size-full"
          audioOutputDeviceId={selectedAudioDeviceOutputId}
          isVideoEnabled={!remoteState.videoDisabled}
          isAudioEnabled={!remoteState.audioMuted}
        />

        <CallControl
          isEndingCall={isEndingCall}
          handleCallEnd={handleCallEnd}
          isAudioMuted={isAudioMuted}
          toggleAudio={toggleAudio}
          isVideoDisabled={isVideoDisabled}
          toggleVideo={toggleVideo}
          selectedVideoDeviceId={selectedVideoInputId}
          videoDevices={videoDevices}
          handleVideoDeviceChange={changeVideoInputDevice}
          selectedAudioInputDeviceId={selectedAudioInputId}
          audioInputDevices={audioInputDevices}
          handleAudioInputDeviceChange={changeAudioInputDevice}
          audioOutputDevices={audioOutputDevices}
          selectedAudioOutputDeviceId={selectedAudioDeviceOutputId}
          handleAudioOutputDeviceChange={setSelectedAudioDeviceOutputId}
        />
      </div>
    </>
  );
}

function EndedPhase({call}: {call: IncomingDirectCall}) {
  const endCall = useCallStore((state) => state.endCall);

  useTimeout(() => {
    endCall(call.sessionId);
  }, 5000);

  return (
    <>
      <CallWindowHeader title="Call ended"/>

      <div className="flex-1 bg-black @container-size flex flex-col justify-center items-center">
        <UserAvatar
          src={call.callerProfile.avatarRevision ? userService.getAvatarUrl(call.callerProfile.id, call.callerProfile.avatarRevision) : undefined}
          alt="Caller avatar"
          className="w-[min(25cqw,25cqh)]"
        />
      </div>
    </>
  )
}