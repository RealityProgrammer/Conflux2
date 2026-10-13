import {type OutgoingDirectCall, useCallStore} from "../../store/useCallStore.ts";
import CallWindowHeader from "./CallWindowHeader.tsx";
import {useAuth} from "../../contexts/AuthContext.tsx";
import IconButton from "../IconButton.tsx";
import {BsTelephoneFill, BsTelephoneXFill} from "react-icons/bs";
import {useTimeout} from "usehooks-ts";
import {useEffect, useRef, useState} from "react";
import {animate} from "animejs";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {
  DirectCallAcceptedEvent,
  DirectCallDeniedEvent,
} from "../../api/events.ts";
import useUserMedia from "../../hooks/useUserMedia.ts";
import Spinner from "../Spinner.tsx";
import useWebRTC from "../../hooks/useWebRTC.ts";
import MediaFeed from "./MediaFeed.tsx";
import CallControl from "./CallControl.tsx";
import {toast} from "react-toastify";
import type {ServiceResponse, TimelineMessageDto} from "../../api/types.ts";
import {directConversationService} from "../../api/directConversationService.ts";
import {useRouteLoaderData} from "react-router";
import type {DirectMessagePageLoaderProps} from "../../router.tsx";
import useTimelineMessageMutations from "../../hooks/useTimelineMessageMutations.ts";
import {Avatar} from "../Avatar.tsx";

export default function OutgoingCallWindowContent({call}: {call: OutgoingDirectCall}) {
  if (call.state === "dialing") {
    return <DialingPhase call={call}/>;
  }

  if (call.state === "canceled") {
    return <CanceledPhase call={call}/>
  }

  if (call.state === "dropped") {
    return <DroppedPhase call={call}/>
  }
  
  if (call.state === "rejected") {
    return <RejectedPhase call={call}/>
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
  const updateCallState = useCallStore((state) => state.updateCallState);
  const endCall = useCallStore((state) => state.endCall);

  const loaderData = useRouteLoaderData("dm") as DirectMessagePageLoaderProps | undefined;
  const { appendMessage } = useTimelineMessageMutations(loaderData?.conversationId ?? "");

  const handleCancelCall = async () => {
    const result: ServiceResponse<TimelineMessageDto> = await directConversationService.cancelDirectCall(call.id);

    if (result.success) {
      updateCallState(call.id, "canceled");
      appendMessage(result.data!);
    } else {
      toast.error("Failed to cancel call.");

      if (result) {
        console.error("Failed to cancel call:", result.error);
      } else {
        console.error("Failed to cancel call.");
      }
    }
  };
  
  useTimeout(() => {
    endCall(call.id);
  }, 60000);

  const calleeAvatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calleeAvatarRef.current) return;

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
  }, []);

  useSignalREvent("DirectCallDenied", (event: DirectCallDeniedEvent) => {
    if (call.id === event.callId) {
      updateCallState(call.id, "rejected");
    }
  });

  useSignalREvent("DirectCallAccepted", (event: DirectCallAcceptedEvent) => {
    if (call.id === event.callId) {
      updateCallState(call.id, "active");
    }
  });

  return (
    <>
      <CallWindowHeader title={`Dialing ${call.calleeProfile!.displayName}`}/>

      <div className="flex-1 bg-black p-6 @container-size relative flex flex-col justify-center items-center">
        <div className="size-full flex flex-row justify-center items-center gap-[10%]">
          <Avatar.User
            userId={userProfile?.id}
            version={userProfile?.avatar?.version}
            alt="Caller avatar"
            className="w-[min(calc(50cqw-0.75rem),50cqh)] aspect-square border-2 border-gray-600 select-none rounded-full"
          />

          <BsTelephoneFill className="size-[min(calc(25cqw),25cqh)]"/>

          <Avatar.User
            ref={calleeAvatarRef}
            userId={call.calleeProfile.id}
            version={call.calleeProfile?.avatar?.version}
            alt="Callee avatar"
            className="w-[min(calc(50cqw-0.75rem),50cqh)] aspect-square border-2 border-gray-600 rounded-full"
          />
        </div>

        <div className="absolute bottom-2 flex flex-row gap-4 p-2 bg-gray-650 border-2 border-gray-600 rounded-lg">
          <IconButton isLoading={false} theme="danger" onClick={handleCancelCall}>
            <BsTelephoneXFill className="size-7"/>
          </IconButton>
        </div>
      </div>
    </>
  );
}

function CanceledPhase({call}: {call: OutgoingDirectCall}) {
  const endCall = useCallStore((state) => state.endCall);

  useTimeout(() => {
    endCall(call.id);
  }, 5000);

  return (
    <>
      <CallWindowHeader title="Call canceled"/>

      <div className="flex-1 bg-black @container-size flex flex-col justify-center items-center">
        <Avatar.User
          userId={call.calleeProfile.id}
          version={call.calleeProfile.avatar?.version}
          alt="Callee avatar"
          className="w-[min(25cqw,25cqh)] aspect-square rounded-full"
        />
      </div>
    </>
  )
}

function RejectedPhase({call}: {call: OutgoingDirectCall}) {
  const endCall = useCallStore((state) => state.endCall);

  useTimeout(() => {
    endCall(call.id);
  }, 5000);

  return (
    <>
      <CallWindowHeader title="Call rejected"/>

      <div className="flex-1 bg-black @container-size flex flex-col justify-center items-center">
        <Avatar.User
          userId={call.calleeProfile.id}
          version={call.calleeProfile.avatar?.version}
          alt="Callee avatar"
          className="w-[min(25cqw,25cqh)] aspect-square rounded-full"
        />
      </div>
    </>
  )
}

function DroppedPhase({call}: {call: OutgoingDirectCall}) {
  const endCall = useCallStore((state) => state.endCall);

  useTimeout(() => {
    endCall(call.id);
  }, 5000);

  return (
    <>
      <CallWindowHeader title="Call dropped"/>

      <div className="flex-1 bg-black @container-size flex flex-col justify-center items-center">
        <Avatar.User
          userId={call.calleeProfile.id}
          version={call.calleeProfile.avatar?.version}
          alt="Callee avatar"
          className="w-[min(25cqw,25cqh)] aspect-square rounded-full"
        />
      </div>
    </>
  )
}

function ActivePhase({call}: {call: OutgoingDirectCall}) {
  const { userProfile } = useAuth();
  const updateCallState = useCallStore((state) => state.updateCallState);
  const [isEndingCall, setIsEndingCall] = useState(false);

  const loaderData = useRouteLoaderData("dm") as DirectMessagePageLoaderProps | undefined;
  const { appendMessage } = useTimelineMessageMutations(loaderData?.conversationId ?? "");

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
    audioOutputDevices
  } = useUserMedia({});

  const [selectedAudioDeviceOutputId, setSelectedAudioDeviceOutputId] = useState<string | undefined>();

  useEffect(() => {
    if (!selectedAudioDeviceOutputId && audioOutputDevices.length > 0) {
      const defaultDevice = audioOutputDevices.find(d => d.deviceId === "default");
      const initialId = defaultDevice?.deviceId ?? audioOutputDevices[0].deviceId;

      setSelectedAudioDeviceOutputId(initialId);
    }
  }, [audioOutputDevices, selectedAudioDeviceOutputId]);

  const calleeId = call.calleeProfile.id;

  const { remoteStreams, remoteMediaStates, connectToPeer } = useWebRTC({
    localStream: stream,
    isAudioMuted,
    isVideoDisabled,
  });
  const remoteStream = remoteStreams[calleeId];
  const remoteState = remoteMediaStates[calleeId] || { videoDisabled: false, audioMuted: false };

  useEffect(() => {
    if (stream && calleeId) {
      connectToPeer(calleeId);
    }
  }, [stream, calleeId, connectToPeer]);

  const handleCallEnd = async () => {
    setIsEndingCall(true);

    const response: ServiceResponse<TimelineMessageDto> = await directConversationService.endDirectCall(call.id);

    if (response.success) {
      updateCallState(call.id, "ended");
      appendMessage(response.data!);
    } else {
      setIsEndingCall(false);
      toast.error(`Failed to end call.`);
      console.error("Failed to end call:", response.error);
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
              peerId={userProfile!.id}
              peerAvatarVersion={userProfile?.avatar?.version}
              isVideoEnabled={!isVideoDisabled}
              className="size-full"
            />
          )}
        </div>

        {/* Remote video */}
        <MediaFeed
          stream={remoteStream}
          peerId={calleeId}
          peerAvatarVersion={call.calleeProfile.avatar?.version}
          displayName={call.calleeProfile.displayName ?? "???"}
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

function EndedPhase({call}: {call: OutgoingDirectCall}) {
  const endCall = useCallStore((state) => state.endCall);

  useTimeout(() => {
    endCall(call.id);
  }, 5000);

  return (
    <>
      <CallWindowHeader title="Call ended"/>

      <div className="flex-1 bg-black @container-size flex flex-col justify-center items-center">
        <Avatar.User
          userId={call.calleeProfile.id}
          version={call.calleeProfile.avatar?.version}
          alt="Callee avatar"
          className="w-[min(25cqw,25cqh)] aspect-square rounded-full"
        />
      </div>
    </>
  )
}