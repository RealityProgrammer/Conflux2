import {type HTMLAttributes, useEffect, useRef, useState} from "react";
import UserAvatar from "../UserAvatar.tsx";
import {BsCameraVideoOffFill, BsMicMuteFill} from "react-icons/bs";
import type {MediaDeviceOption} from "../../hooks/useUserMedia.ts";

interface StreamVideoProps {
  stream: MediaStream | null;
  avatarUrl?: string;
  displayName?: string;
  isLocal?: boolean;
  className?: string;
  audioOutputDeviceId?: string;
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
}

export default function MediaFeed({
  stream,
  avatarUrl,
  displayName,
  className = '',
  audioOutputDeviceId,
  isLocal,
  isVideoEnabled = true,
  isAudioEnabled = true,
}: StreamVideoProps) {
  useEffect(() => {
    console.log('[MediaFeed] stream prop', {
      streamId: stream?.id,
      tracks: stream?.getTracks().map(t => ({
        kind: t.kind, enabled: t.enabled, muted: t.muted, readyState: t.readyState,
      })),
      isLocal, isVideoEnabled, isAudioEnabled,
    });
  }, [stream, isLocal, isVideoEnabled, isAudioEnabled]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    console.log('[MediaFeed] hasVideo/hasAudio', { hasVideo, hasAudio });
  }, [hasVideo, hasAudio]);

  useEffect(() => {
    if (!stream) {
      setHasVideo(false);
      setHasAudio(false);
      return;
    }

    const updateTrackState = () => {
      setHasVideo(stream.getVideoTracks().some((t) => t.enabled && !t.muted && t.readyState === "live") && isVideoEnabled);
      setHasAudio(stream.getAudioTracks().some((t) => t.enabled && !t.muted && t.readyState === "live") && isAudioEnabled);
    };

    const attached = new Set<MediaStreamTrack>();

    const attach = (track: MediaStreamTrack) => {
      if (attached.has(track)) return;
      track.addEventListener("mute", updateTrackState);
      track.addEventListener("unmute", updateTrackState);
      track.addEventListener("ended", updateTrackState);
      attached.add(track);
    };

    const detach = (track: MediaStreamTrack) => {
      if (!attached.has(track)) return;
      track.removeEventListener("mute", updateTrackState);
      track.removeEventListener("unmute", updateTrackState);
      track.removeEventListener("ended", updateTrackState);
      attached.delete(track);
    };

    stream.getTracks().forEach(attach);
    updateTrackState();

    const onAddTrack = (e: MediaStreamTrackEvent) => {
      attach(e.track);
      updateTrackState();
    };
    const onRemoveTrack = (e: MediaStreamTrackEvent) => {
      detach(e.track);
      updateTrackState();
    };

    stream.addEventListener("addtrack", onAddTrack);
    stream.addEventListener("removetrack", onRemoveTrack);

    return () => {
      stream.removeEventListener("addtrack", onAddTrack);
      stream.removeEventListener("removetrack", onRemoveTrack);
      attached.forEach(detach);
    };
  }, [stream, isVideoEnabled, isAudioEnabled]);

  useEffect(() => {
    if (videoRef.current && audioOutputDeviceId) {
      videoRef.current.setSinkId(audioOutputDeviceId).catch((err) => {
        console.error("Failed to set audio output device:", err);
      });
    }
  }, [audioOutputDeviceId]);

  useEffect(() => {
    if (!videoRef.current || !stream) return;

    if (videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }

    const tryPlay = () => {
      videoRef.current!.play().catch(() => {
        const resume = () => {
          videoRef.current!.play().catch(() => {});
          window.removeEventListener("pointerdown", resume);
          window.removeEventListener("keydown", resume);
        };
        window.addEventListener("pointerdown", resume, { once: true });
        window.addEventListener("keydown", resume, { once: true });
      });
    };

    tryPlay();
  }, [stream]);

  return (
    <div className={`relative flex items-center justify-center bg-gray-900 overflow-hidden ${className}`}>
      {/* always mounted so that audio be playing */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`size-full object-contain ${isLocal ? "-scale-x-100" : ""} ${hasVideo ? "block" : "hidden"}`}
      />

      {!hasVideo && (
        <div className="flex flex-col items-center justify-center gap-2 p-2 max-w-full max-h-full">
          <UserAvatar
            src={avatarUrl}
            alt={`${displayName}'s avatar`}
            className="size-12 shrink-0 aspect-square rounded-full ring-2 ring-gray-700 overflow-hidden shadow-lg select-none object-cover"
          />

          {displayName && (
            <span className="text-sm font-medium text-gray-200 select-none truncate">
              {displayName}
            </span>
          )}

          <div className="flex items-center gap-2">
            <BsCameraVideoOffFill className="size-4 fill-red-500"/>

            {!hasAudio && (
              <BsMicMuteFill className="size-4 fill-red-500"/>
            )}
          </div>
        </div>
      )}
    </div>
  );
}