import {useEffect, useRef, useState} from "react";
import {useSignalR} from "../contexts/SignalRContext.tsx";
import useSignalREvent from "./useSignalREvent.ts";

const RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19020" },
    { urls: "stun:stun1.l.google.com:19020" },
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
  const iceQueuesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const localStreamRef = useRef<MediaStream | null>(null);
  useEffect(() => {
    localStreamRef.current = localStream;

    if (localStream) {
      peersRef.current.forEach((pc) => {
        localStream.getTracks().forEach((track) => {
          const senders = pc.getSenders();
          const hasTrack = senders.some((s) => s.track?.id === track.id);
          if (!hasTrack) {
            pc.addTrack(track, localStream);
          }
        });
      });
    }
  }, [localStream]);

  const disconnectFromPeer = (peerId: string) => {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.close();
      peersRef.current.delete(peerId);
      iceQueuesRef.current.delete(peerId);
    }

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
    iceQueuesRef.current.set(peerId, []);

    // attach local media to the current peer connection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // listen to peer's media tracks
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [peerId]: event.streams[0] || new MediaStream([event.track]),
      }));
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
    const pc = createPeerConnection(targetPeerId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await invokeSafely("SendOffer", targetPeerId, offer.sdp);
    } catch (err) {
      console.error(`Error connecting to ${targetPeerId}:`, err);
    }
  };

  useSignalREvent("ReceiveCallOffer", async (senderId: string, sdp: string): Promise<void> => {
    const pc = createPeerConnection(senderId); // Creates receiver PC
    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp }));
      await processIceQueue(senderId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await invokeSafely("SendAnswer", senderId, answer.sdp);
    } catch (err) {
      console.error(`Error handling offer from ${senderId}:`, err);
    }
  });

  useSignalREvent("ReceiveCallAnswer", async (senderId: string, sdp: string) => {
    const pc = peersRef.current.get(senderId);
    if (!pc) return;
    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp }));
      await processIceQueue(senderId, pc);
    } catch (err) {
      console.error(`Error handling answer from ${senderId}:`, err);
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