import {type HTMLAttributes, useEffect, useRef} from "react";

export default function RemoteVideo({
  stream,
  ...props
}: { stream: MediaStream } & HTMLAttributes<HTMLVideoElement>) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      {...props}
    />
  );
}