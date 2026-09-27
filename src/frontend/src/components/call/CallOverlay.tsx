import {useCallStore} from "../../store/useCallStore.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {CancelDirectCallEvent, IncomingDirectCallEvent} from "../../api/events.ts";
import CallWindow from "./CallWindow.tsx";

export default function CallOverlay() {
  const calls = useCallStore((state) => state.calls);
  const startIncomingDirectCall = useCallStore((state) => state.startIncomingDirectCall);
  const endCall = useCallStore((state) => state.endCall);

  useSignalREvent("IncomingDirectCall", (event: IncomingDirectCallEvent) => {
    startIncomingDirectCall(event.callerProfile);
  });

  useSignalREvent("DirectCallCanceled", (event: CancelDirectCallEvent) => {
    // caller cancel the call to callee
    let callToCancel = useCallStore.getState().calls.find(
      c => c.type === "incoming_direct" && c.callerProfile.id === event.cancelerUserId
    );

    if (callToCancel) {
      endCall(callToCancel.sessionId);
      return;
    }

    // callee cancel the call to caller
    callToCancel = useCallStore.getState().calls.find(
      c => c.type === "outgoing_direct" && c.calleeProfile.id === event.cancelerUserId
    );

    if (callToCancel) {
      endCall(callToCancel.sessionId);
      return;
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