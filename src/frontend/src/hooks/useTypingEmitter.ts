import {useRef} from "react";
import {useSignalR} from "../contexts/SignalRContext.tsx";

const TYPING_THROTTLE_MS = 2000; // Only notify server once every 2 seconds

export function useTypingEmitter(conversationId: string) {
  const lastTypedTime = useRef<number>(0);

  const { connection: signalRConnection, isConnected, invokeSafely } = useSignalR();

  const notifyTyping = () => {
    if (!signalRConnection || !isConnected || !conversationId) return;

    const now = Date.now();
    if (now - lastTypedTime.current > TYPING_THROTTLE_MS) {
      lastTypedTime.current = now;

      invokeSafely("NotifyTyping", conversationId).catch(console.error);
    }
  };

  return notifyTyping;
}