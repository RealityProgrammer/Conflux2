import {type HTMLAttributes, useEffect, useRef, useState} from "react";
import UserAvatar from "../UserAvatar.tsx";
import {BsCameraVideoOffFill, BsMicMuteFill} from "react-icons/bs";

interface StreamVideoProps {
  stream: MediaStream | null;
  avatarUrl?: string;
  displayName?: string;
  className?: string;
  isLocal?: boolean;
}

export default function MediaFeed({
  stream,
  avatarUrl,
  displayName,
  className = '',
  isLocal,
}: StreamVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    console.log("steam changed");

    if (!stream) {
      setHasVideo(false);
      setHasAudio(false);
      return;
    }

    const updateTrackState = () => {
      const vTracks = stream.getVideoTracks();
      const aTracks = stream.getAudioTracks();

      setHasVideo(vTracks.some((t) => t.enabled && t.readyState === "live"));
      setHasAudio(aTracks.some((t) => t.enabled && t.readyState === "live"));
    };

    updateTrackState();

    const tracks = stream.getTracks();
    tracks.forEach((track) => {
      track.addEventListener("mute", updateTrackState);
      track.addEventListener("unmute", updateTrackState);
      track.addEventListener("ended", updateTrackState);
    });

    return () => {
      tracks.forEach((track) => {
        track.removeEventListener("mute", updateTrackState);
        track.removeEventListener("unmute", updateTrackState);
        track.removeEventListener("ended", updateTrackState);
      });
    };
  }, [stream]);

  useEffect(() => {
    if (videoRef.current && stream && hasVideo) {
      videoRef.current.srcObject = stream;

      videoRef.current.play().catch((err) => {
        console.warn("Autoplay deferred until tab interaction:", err);
      });
    }
  }, [stream, hasVideo]);

  return (
    <div className={`relative flex items-center justify-center bg-gray-900 overflow-hidden ${className}`}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`size-full object-contain ${isLocal ? "-scale-x-100" : ""}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 p-4">
          <UserAvatar
            src={avatarUrl}
            alt={`${displayName}'s avatar`}
            className="size-20 rounded-full ring-2 ring-gray-700 overflow-hidden shadow-lg select-none"
          />

          {displayName && (
            <span className="text-sm font-medium text-gray-200 select-none">{displayName}</span>
          )}

          <div className="flex items-center gap-2 mt-1">
            {!hasVideo && (
              <div
                title="Camera Off"
                className="flex items-center justify-center size-8 rounded-full bg-red-500/20 border border-red-500/40 text-red-500"
              >
                <BsCameraVideoOffFill className="size-4" />
              </div>
            )}

            {!hasAudio && (
              <div
                title="Microphone Off"
                className="flex items-center justify-center size-8 rounded-full bg-red-500/20 border border-red-500/40 text-red-500"
              >
                <BsMicMuteFill className="size-4" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}