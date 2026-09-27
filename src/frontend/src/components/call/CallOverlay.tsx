import {useCallStore} from "../../store/useCallStore.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {
  DirectCallDroppedEvent,
  IncomingDirectCallEvent
} from "../../api/events.ts";
import CallWindow from "./CallWindow.tsx";

export default function CallOverlay() {
  const call = useCallStore((state) => state.call);
  const startIncomingDirectCall = useCallStore((state) => state.startIncomingDirectCall);

  useSignalREvent("IncomingDirectCall", (event: IncomingDirectCallEvent) => {
    startIncomingDirectCall(event.callerProfile);
  });

  return (
    <section className="fixed inset-0 z-100000 pointer-events-none overflow-hidden text-white">
      {call && (
        <CallWindow key={call.sessionId} callSessionId={call.sessionId}/>
      )}
    </section>
  )
}