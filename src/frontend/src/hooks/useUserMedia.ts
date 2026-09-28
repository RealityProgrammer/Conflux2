import {useEffect, useRef, useState} from "react";

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

interface UseUserMediaProps {
  autoStart?: boolean;
  initialAudioDeviceId?: string;
  initialVideoDeviceId?: string;
}

interface UseUserMediaResult {
  stream: MediaStream | null;
  audioDevices: MediaDeviceOption[];
  videoDevices: MediaDeviceOption[];
  isAcquiringMedia: boolean;
  selectedAudioId?: string;
  selectedVideoId?: string;
  isAudioMuted: boolean;
  isVideoDisabled: boolean;
  error: Error | null;
  startStream: (audioDeviceId?: string, videoDeviceId?: string) => Promise<MediaStream | null>;
  stopStream: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  changeAudioDevice: (deviceId: string) => Promise<MediaStream | null>;
  changeVideoDevice: (deviceId: string) => Promise<MediaStream | null>;
}

export default function useUserMedia({
  autoStart = true,
  initialVideoDeviceId,
  initialAudioDeviceId,
}: UseUserMediaProps): UseUserMediaResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceOption[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceOption[]>([]);

  const [isAcquiringMedia, setIsAcquiringMedia] = useState(false);

  const [selectedAudioId, setSelectedAudioId] = useState<string | undefined>(initialAudioDeviceId);
  const [selectedVideoId, setSelectedVideoId] = useState<string | undefined>(initialVideoDeviceId);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  };

  const updateDeviceList = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices
        .filter((d) => d.kind === "audioinput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
        }));

      const videoInputs = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));

      setAudioDevices(audioInputs);
      setVideoDevices(videoInputs);
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
    }
  };

  const startStream = async (audioDeviceId?: string, videoDeviceId?: string): Promise<MediaStream | null> => {
    // clean existing stream before getting a new one
    stopStream();
    setError(null);
    setIsAcquiringMedia(true);

    const constraints: MediaStreamConstraints = {
      audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      video: videoDeviceId
        ? { deviceId: { exact: videoDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } },
    };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      streamRef.current = mediaStream;
      setStream(mediaStream);

      mediaStream.getAudioTracks().forEach((t) => (t.enabled = !isAudioMuted));
      mediaStream.getVideoTracks().forEach((t) => (t.enabled = !isVideoDisabled));

      await updateDeviceList();

      return mediaStream;
    } catch (err) {
      const mediaError = err instanceof Error ? err : new Error("Failed to acquire user media");
      setError(mediaError);
      console.error("getUserMedia error:", err);
      return null;
    } finally {
      setIsAcquiringMedia(false);
    }
  };

  const changeAudioDevice = (deviceId: string): Promise<MediaStream | null> => {
    setSelectedAudioId(deviceId);
    return startStream(deviceId, selectedVideoId);
  };

  const changeVideoDevice = (deviceId: string): Promise<MediaStream | null> => {
    setSelectedVideoId(deviceId);
    return startStream(selectedAudioId, deviceId);
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const nextState = !isAudioMuted;
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextState; // false = mute, true = unmute
      });
      setIsAudioMuted(nextState);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const nextState = !isVideoDisabled;
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextState; // false = camera off, true = camera on
      });
      setIsVideoDisabled(nextState);
    }
  };

  // listen to device changed event
  useEffect(() => {
    const handleDeviceChange = () => {
      updateDeviceList();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [updateDeviceList]);

  useEffect(() => {
    if (autoStart) {
      startStream(selectedAudioId, selectedVideoId);
    }

    return () => {
      stopStream();
    };
  }, []);

  return {
    stream,
    audioDevices,
    videoDevices,
    isAcquiringMedia,
    selectedAudioId,
    selectedVideoId,
    isAudioMuted,
    isVideoDisabled,
    toggleAudio,
    toggleVideo,
    error,
    startStream,
    stopStream,
    changeAudioDevice,
    changeVideoDevice,
  };
}