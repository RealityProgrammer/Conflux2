import {useEffect, useRef, useState} from "react";
import {useSignalR} from "../contexts/SignalRContext.tsx";
import useSignalREvent from "./useSignalREvent.ts";

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

interface UseWebRTCProps {
  localStream: MediaStream | null;
}

export interface UseWebRTCResult {
  remoteStreams: Record<string, MediaStream>;
  connectToPeer: (targetPeerId: string) => Promise<void>;
  disconnectFromPeer: (peerId: string) => void;
}

export default function useWebRTC({
  localStream,
}: UseWebRTCProps): UseWebRTCResult {
  const { invokeSafely } = useSignalR();

  // mesh architecture, cuz idk how to implement SFU lmao
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const connectingPeersRef = useRef<Set<string>>(new Set());
  const iceQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    localStreamRef.current = localStream;

    if (!localStream) return;

    peersRef.current.forEach(async (pc, peerId) => {
      const senders = pc.getSenders();
      let needsRenegotiation = false;

      localStream.getTracks().forEach((newTrack) => {
        const existingSender = senders.find(
          (sender) => sender.track && sender.track.kind === newTrack.kind
        );

        if (existingSender) {
          if (existingSender.track?.id !== newTrack.id) {
            existingSender.replaceTrack(newTrack).catch((err) => {
              console.error(`Failed to replace ${newTrack.kind} track for peer ${peerId}:`, err);
            });
          }
        } else {
          // new media type added (requires initial negotiation)
          pc.addTrack(newTrack, localStream);
          needsRenegotiation = true;
        }
      });

      if (needsRenegotiation && pc.signalingState === "stable") {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await invokeSafely("SendOffer", peerId, offer.sdp);
        } catch (err) {
          console.error(`Failed to send renegotiation offer to ${peerId}:`, err);
        }
      }
    });
  }, [localStream]);

  const disconnectFromPeer = (peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
      iceQueuesRef.current.delete(peerId);
    }

    connectingPeersRef.current.delete(peerId);

    setRemoteStreams((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  };

  const createPeerConnection = (peerId: string) => {
    if (peersRef.current.has(peerId)) return peersRef.current.get(peerId)!;

    const pc = new RTCPeerConnection(RTC_CONFIGURATION);
    peersRef.current.set(peerId, pc);

    if (!iceQueuesRef.current.has(peerId)) {
      iceQueuesRef.current.set(peerId, []);
    }

    // attach local media to the current peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // accumulate tracks onto peer's remote media stream
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => {
        const existingStream = prev[peerId];

        if (existingStream) {
          if (!existingStream.getTracks().some((t) => t.id === event.track.id)) {
            existingStream.addTrack(event.track);
          }

          return { ...prev, [peerId]: new MediaStream(existingStream.getTracks()) };
        }

        const stream = event.streams[0] || new MediaStream([event.track]);
        return { ...prev, [peerId]: stream };
      });
    };

    // send ice candidate to peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        invokeSafely("SendIceCandidate", peerId, JSON.stringify(event.candidate));
      }
    };

    // clean up if connection dropped
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
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
    if (connectingPeersRef.current.has(targetPeerId)) {
      console.warn(`Skipping duplicate offer negotiating with ${targetPeerId}.`);
      return;
    }
    connectingPeersRef.current.add(targetPeerId);

    const pc = createPeerConnection(targetPeerId);

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
    const pc = createPeerConnection(senderId);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        const senders = pc.getSenders();
        if (!senders.some((s) => s.track?.id === track.id)) {
          pc.addTrack(track, localStreamRef.current!);
        }
      });
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));
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

  return { remoteStreams, connectToPeer, disconnectFromPeer };
}