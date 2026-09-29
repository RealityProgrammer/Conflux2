import {useCallStore} from "../../store/useCallStore.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {
  DirectCallDroppedEvent,
  IncomingDirectCallEvent
} from "../../api/events.ts";
import CallWindow from "./CallWindow.tsx";
import {useEffect} from "react";
import {useSignalR} from "../../contexts/SignalRContext.tsx";
import type {DirectCallContext} from "../../api/types.ts";

export default function CallOverlay() {
  const { invokeSafely } = useSignalR();
  const call = useCallStore((state) => state.call);
  const startIncomingDirectCall = useCallStore((state) => state.startIncomingDirectCall);

  // check if there is ongoing "incoming call" if callee refresh page while having an incoming call
  useEffect(() => {
    (async () => {
      try {
        const result: DirectCallContext = await invokeSafely("GetCurrentRingingCall");

        if (result && result.result.isSuccess) {
          startIncomingDirectCall(result.peerProfile!);
        }
      } catch (err) {
        console.log("Failed to get current call:", err);
      }
    })();
  }, [invokeSafely]);

  useSignalREvent("IncomingDirectCall", (event: IncomingDirectCallEvent) => {
    startIncomingDirectCall(event.callerProfile);
  });

  return (
    <section className="fixed inset-0 z-2000 pointer-events-none overflow-hidden text-white">
      {call && (
        <CallWindow key={call.sessionId} callSessionId={call.sessionId}/>
      )}
    </section>
  )
}