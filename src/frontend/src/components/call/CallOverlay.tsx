import {useCallStore} from "../../store/useCallStore.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {
  AcceptDirectCallEvent,
  CancelDirectCallEvent,
  DirectCallEndedEvent,
  IncomingDirectCallEvent
} from "../../api/events.ts";
import CallWindow from "./CallWindow.tsx";

export default function CallOverlay() {
  const calls = useCallStore((state) => state.calls);
  const startIncomingDirectCall = useCallStore((state) => state.startIncomingDirectCall);
  const markCallAsConnected = useCallStore((state) => state.markCallAsConnected);
  const endCall = useCallStore((state) => state.endCall);

  useSignalREvent("IncomingDirectCall", (event: IncomingDirectCallEvent) => {
    startIncomingDirectCall(event.callerProfile);
  });

  useSignalREvent("DirectCallCanceled", (event: CancelDirectCallEvent) => {
    const callToCancel = useCallStore.getState().calls.find(c =>
      (c.type === "incoming_direct" && c.callerProfile.id === event.cancelerUserId) ||
      (c.type === "outgoing_direct" && c.calleeProfile.id === event.cancelerUserId)
    );

    if (callToCancel) {
      endCall(callToCancel.sessionId);
    }
  });

  useSignalREvent("DirectCallAccepted", (event: AcceptDirectCallEvent) => {
    const callToUpdate = useCallStore.getState().calls.find(
      c => c.type === "outgoing_direct" && c.calleeProfile.id === event.calleeUserId
    );

    if (callToUpdate) {
      markCallAsConnected(callToUpdate.sessionId);
    }
  });

  useSignalREvent("DirectCallEnded", (event: DirectCallEndedEvent) => {
    let callToRemove = useCallStore.getState().calls.find(c =>
      (c.type === "outgoing_direct" && c.calleeProfile.id === event.enderUserId) ||
      (c.type === "incoming_direct" && c.callerProfile.id === event.enderUserId)
    );

    if (callToRemove) {
      endCall(callToRemove.sessionId);
    }
  });

  return (
    <section className="fixed inset-0 z-100000 pointer-events-none overflow-hidden text-white">
      {calls.map((call) => (
        <CallWindow key={call.sessionId} callSessionId={call.sessionId}/>
      ))}
    </section>
  )
}