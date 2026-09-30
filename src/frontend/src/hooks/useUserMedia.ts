import {useEffect, useRef, useState} from "react";

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

interface UseUserMediaProps {
  autoStart?: boolean;
  initialAudioInputDeviceId?: string;
  initialVideoInputDeviceId?: string;
}

interface UseUserMediaResult {
  stream: MediaStream | null;
  audioInputDevices: MediaDeviceOption[];
  audioOutputDevices: MediaDeviceOption[];
  videoDevices: MediaDeviceOption[];
  isAcquiringMedia: boolean;
  selectedAudioInputId?: string;
  selectedVideoInputId?: string;
  isAudioMuted: boolean;
  isVideoDisabled: boolean;
  error: Error | null;
  startStream: (audioDeviceId?: string, videoDeviceId?: string) => Promise<MediaStream | null>;
  stopStream: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  changeAudioInputDevice: (deviceId: string) => Promise<MediaStream | null>;
  changeVideoInputDevice: (deviceId: string) => Promise<MediaStream | null>;
}

export default function useUserMedia({
  autoStart = true,
  initialVideoInputDeviceId,
  initialAudioInputDeviceId,
}: UseUserMediaProps): UseUserMediaResult {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceOption[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceOption[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceOption[]>([]);

  const [isAcquiringMedia, setIsAcquiringMedia] = useState(false);

  const [selectedAudioInputId, setSelectedAudioInputId] = useState<string | undefined>(initialAudioInputDeviceId);
  const [selectedVideoInputId, setSelectedVideoInputId] = useState<string | undefined>(initialVideoInputDeviceId);

  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const streamRef = useRef<MediaStream | null>(null);

  // track component mount status and request sequencing to prevent async race conditions
  const isMountedRef = useRef<boolean>(true);
  const requestIdRef = useRef<number>(0);

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

      const audioOutputs = devices
        .filter((d) => d.kind === "audiooutput")
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

      setAudioInputDevices(audioInputs);
      setAudioOutputDevices(audioOutputs);
      setVideoDevices(videoInputs);
    } catch (err) {
      console.error("Failed to enumerate devices:", err);
    }
  };

  const startStream = async (audioDeviceId?: string, videoDeviceId?: string): Promise<MediaStream | null> => {
    const currentRequestId = ++requestIdRef.current;
    const oldStream = streamRef.current;

    setError(null);
    setIsAcquiringMedia(true);

    const constraints: MediaStreamConstraints = {
      audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      video: videoDeviceId ?
        { deviceId: { exact: videoDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } :
        { width: { ideal: 1280 }, height: { ideal: 720 } },
    };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // if component unmounted or a newer startStream call was made, stop tracks immediately
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return null;
      }

      if (oldStream) {
        oldStream.getTracks().forEach((track) => track.stop());
      }

      streamRef.current = mediaStream;

      const activeAudioTrack = mediaStream.getAudioTracks()[0];
      if (activeAudioTrack) {
        const settings = activeAudioTrack.getSettings();
        if (settings.deviceId) {
          setSelectedAudioInputId(settings.deviceId);
        }
      }

      const activeVideoTrack = mediaStream.getVideoTracks()[0];
      if (activeVideoTrack) {
        const settings = activeVideoTrack.getSettings();
        if (settings.deviceId) {
          setSelectedVideoInputId(settings.deviceId);
        }
      }

      mediaStream.getAudioTracks().forEach((t) => (t.enabled = !isAudioMuted));
      mediaStream.getVideoTracks().forEach((t) => (t.enabled = !isVideoDisabled));

      setStream(mediaStream);

      await updateDeviceList();

      return mediaStream;
    } catch (err) {
      if (!isMountedRef.current || currentRequestId !== requestIdRef.current) {
        return null;
      }

      const mediaError = err instanceof Error ? err : new Error("Failed to acquire user media");
      setError(mediaError);
      console.error("getUserMedia error:", err);
      return null;
    } finally {
      if (isMountedRef.current && currentRequestId === requestIdRef.current) {
        setIsAcquiringMedia(false);
      }
    }
  };

  const changeAudioInputDevice = (deviceId: string): Promise<MediaStream | null> => {
    setSelectedAudioInputId(deviceId);
    return startStream(deviceId, selectedVideoInputId);
  };

  const changeVideoInputDevice = (deviceId: string): Promise<MediaStream | null> => {
    setSelectedVideoInputId(deviceId);
    return startStream(selectedAudioInputId, deviceId);
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const nextIsMuted = !isAudioMuted;

      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextIsMuted;
      });

      setIsAudioMuted(nextIsMuted);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const nextIsDisabled = !isVideoDisabled;

      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextIsDisabled;
      });

      setIsVideoDisabled(nextIsDisabled);
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
    isMountedRef.current = true;

    if (autoStart) {
      startStream(selectedAudioInputId, selectedVideoInputId);
    }

    return () => {
      isMountedRef.current = false;
      stopStream();
    };
  }, []);

  return {
    stream,
    audioInputDevices,
    audioOutputDevices,
    videoDevices,
    isAcquiringMedia,
    selectedAudioInputId,
    selectedVideoInputId,
    isAudioMuted,
    isVideoDisabled,
    toggleAudio,
    toggleVideo,
    error,
    startStream,
    stopStream,
    changeAudioInputDevice,
    changeVideoInputDevice,
  };
}