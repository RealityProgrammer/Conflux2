import {useEffect, useRef, useState} from "react";
import {useSignalR} from "../contexts/SignalRContext.tsx";
import useSignalREvent from "./useSignalREvent.ts";

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type RemoteMediaStates = {
  videoDisabled: boolean;
  audioMuted: boolean;
}

interface UseWebRTCProps {
  localStream: MediaStream | null;
  isVideoDisabled?: boolean;
  isAudioMuted?: boolean;
}

export interface UseWebRTCResult {
  remoteStreams: Record<string, MediaStream>;
  remoteMediaStates: Record<string, RemoteMediaStates>;
  connectToPeer: (targetPeerId: string) => Promise<void>;
  disconnectFromPeer: (peerId: string) => void;
}

export default function useWebRTC({
  localStream,
  isVideoDisabled,
  isAudioMuted,
}: UseWebRTCProps): UseWebRTCResult {
  const { invokeSafely } = useSignalR();

  // mesh architecture, cuz idk how to implement SFU lmao
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [remoteMediaStates, setRemoteMediaStates] = useState<Record<string, RemoteMediaStates>>({});

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const connectingPeersRef = useRef<Set<string>>(new Set());
  const dataChannelsRef = useRef<Map<string, RTCDataChannel>>(new Map());
  const iceQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  const isVideoDisabledRef = useRef(isVideoDisabled);
  const isAudioMutedRef = useRef(isAudioMuted);

  useEffect(() => {
    isVideoDisabledRef.current = isVideoDisabled;
    isAudioMutedRef.current = isAudioMuted;

    const message = JSON.stringify({
      videoDisabled: isVideoDisabled ?? false,
      audioMuted: isAudioMuted ?? false
    });

    dataChannelsRef.current.forEach((dc) => {
      if (dc.readyState === "open") dc.send(message);
    });
  }, [isVideoDisabled, isAudioMuted]);

  useEffect(() => {
    localStreamRef.current = localStream;

    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    const audioTrack = localStream.getAudioTracks()[0];

    peersRef.current.forEach((pc) => {
      pc.getTransceivers().forEach((transceiver) => {
        const kind = transceiver.receiver.track?.kind || transceiver.sender.track?.kind;

        switch (kind) {
          case "video": {
            const targetTrack = !isVideoDisabled && videoTrack ? videoTrack : null;
            if (transceiver.sender.track !== targetTrack) {
              transceiver.sender.replaceTrack(targetTrack).catch((err) => {
                console.error("Failed to replace video track:", err);
              });
            }
            break;
          }

          case "audio": {
            const targetTrack = !isAudioMuted && audioTrack ? audioTrack : null;
            if (transceiver.sender.track !== targetTrack) {
              transceiver.sender.replaceTrack(targetTrack).catch((err) => {
                console.error("Failed to replace audio track:", err);
              });
            }
            break;
          }
        }
      });
    });
  }, [localStream, isVideoDisabled, isAudioMuted]);

  const disconnectFromPeer = (peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
      iceQueuesRef.current.delete(peerId);
      dataChannelsRef.current.delete(peerId);
    }

    connectingPeersRef.current.delete(peerId);

    setRemoteStreams((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });

    setRemoteMediaStates((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  };

  const createPeerConnection = (peerId: string, isInitiator: boolean) => {
    console.log(`[createPeerConnection] peerId=${peerId} isInitiator=${isInitiator}`);

    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;

    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    peersRef.current.set(peerId, pc);

    if (isInitiator) {
      const audioTrack = localStreamRef.current && !isAudioMutedRef.current ? localStreamRef.current.getAudioTracks()[0] : null;
      const videoTrack = localStreamRef.current && !isVideoDisabledRef.current ? localStreamRef.current.getVideoTracks()[0] : null;

      pc.addTransceiver(audioTrack || "audio", { direction: "sendrecv" });
      pc.addTransceiver(videoTrack || "video", { direction: "sendrecv" });

      const dc = pc.createDataChannel("media-state");
      dataChannelsRef.current.set(peerId, dc);

      dc.onopen = () => {
        dc.send(JSON.stringify({
          videoDisabled: isVideoDisabledRef.current ?? false,
          audioMuted: isAudioMutedRef.current ?? false
        } as RemoteMediaStates));
      };

      dc.onmessage = (e) => {
        try {
          const state = JSON.parse(e.data);
          setRemoteMediaStates((prev) => ({...prev, [peerId]: state}));
        } catch (err) {
        }
      };
    }

    pc.ondatachannel = (event) => {
      const incomingDc = event.channel;

      if (incomingDc.label === "media-state") {
        dataChannelsRef.current.set(peerId, incomingDc);

        incomingDc.onmessage = (e) => {
          try {
            const state = JSON.parse(e.data);
            setRemoteMediaStates((prev) => ({ ...prev, [peerId]: state }));
          } catch (err) {}
        };

        const sendLocalState = () => {
          if (incomingDc.readyState === "open") {
            incomingDc.send(JSON.stringify({
              videoDisabled: isVideoDisabledRef.current ?? false,
              audioMuted: isAudioMutedRef.current ?? false
            } as RemoteMediaStates));
          }
        };

        incomingDc.onopen = sendLocalState;

        if (incomingDc.readyState === "open") {
          sendLocalState();
        }
      }
    };

    if (!iceQueuesRef.current.has(peerId)) {
      iceQueuesRef.current.set(peerId, []);
    }

    // accumulate tracks onto peer's remote media stream
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => {
        const existingStream = prev[peerId];

        if (existingStream) {
          if (!existingStream.getTracks().some((t) => t.id === event.track.id)) {
            return {
              ...prev,
              [peerId]: new MediaStream([...existingStream.getTracks(), event.track]),
            };
          }

          return prev;
        }

        return { ...prev, [peerId]: new MediaStream([event.track]) };
      });
    };

    // send ice candidate to peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        invokeSafely("SendIceCandidate", peerId, JSON.stringify(event.candidate));
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "failed") {
        disconnectFromPeer(peerId);
      }
    };

    return pc;
  };

  // process queued ice candidates
  const processIceQueue = async (peerId: string, pc: RTCPeerConnection) => {
    const queue = iceQueuesRef.current.get(peerId) || [];
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  };

  // connect when user connects to the call
  const connectToPeer = async (targetPeerId: string): Promise<void> => {
    console.log(`[connectToPeer] target=${targetPeerId} caller=${new Error().stack}`);

    if (connectingPeersRef.current.has(targetPeerId)) {
      console.warn(`Skipping duplicate offer negotiating with ${targetPeerId}.`);
      return;
    }
    connectingPeersRef.current.add(targetPeerId);

    const pc = createPeerConnection(targetPeerId, true);

    if (pc.signalingState !== "stable") {
      console.warn(`Connection to ${targetPeerId} is not stable.`);
      return;
    }

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await invokeSafely("SendOffer", targetPeerId, offer.sdp);
    } catch (err) {
      console.error(`Error connecting to ${targetPeerId}:`, err);
      connectingPeersRef.current.delete(targetPeerId);
    }
  };

  useSignalREvent("ReceiveCallOffer", async (senderId: string, sdp: string): Promise<void> => {
    const pc = createPeerConnection(senderId, false);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));

      pc.getTransceivers().forEach((transceiver) => {
        transceiver.direction = "sendrecv";
      });

      if (localStreamRef.current) {
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        const videoTrack = localStreamRef.current.getVideoTracks()[0];

        pc.getTransceivers().forEach((transceiver) => {
          const kind = transceiver.receiver.track?.kind;

          if (kind === "audio" && audioTrack && !isAudioMutedRef.current) {
            transceiver.sender.replaceTrack(audioTrack).catch(console.error);
          }
          if (kind === "video" && videoTrack && !isVideoDisabledRef.current) {
            transceiver.sender.replaceTrack(videoTrack).catch(console.error);
          }
        });
      }

      await processIceQueue(senderId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await invokeSafely("SendAnswer", senderId, answer.sdp);
    } catch (err) {
      console.error(`Error handling WebRTC offer from ${senderId}:`, err);
    }
  });

  useSignalREvent("ReceiveCallAnswer", async (senderId: string, sdp: string) => {
    const pc = peersRef.current.get(senderId);
    if (!pc) return;

    pc.getTransceivers().map((t) => {
      console.log("transceivers direction", t.direction);
    });

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));
      await processIceQueue(senderId, pc);
    } catch (err) {
      console.error(`Error handling WebRTC answer from ${senderId}:`, err);
    }
  });

  useSignalREvent("ReceiveIceCandidate", async (senderId: string, candidateJson: string) => {
    const pc = peersRef.current.get(senderId);
    const candidateInit: RTCIceCandidateInit = JSON.parse(candidateJson);

    if (pc?.remoteDescription?.type) {
      await pc.addIceCandidate(new RTCIceCandidate(candidateInit));
    } else {
      // Queue it if the offer/answer hasn't finished processing
      const queue = iceQueuesRef.current.get(senderId) || [];
      queue.push(candidateInit);
      iceQueuesRef.current.set(senderId, queue);
    }
  });

  return { remoteStreams, remoteMediaStates, connectToPeer, disconnectFromPeer };
}