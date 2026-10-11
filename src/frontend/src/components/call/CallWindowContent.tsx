import {type Call, useCallStore} from "../../store/useCallStore.ts";
import OutgoingCallWindowContent from "./OutgoingCallWindowContent.tsx";
import IncomingCallWindowContent from "./IncomingCallWindowContent.tsx";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {DirectCallDroppedEvent, DirectCallEndedEvent} from "../../api/events.ts";

export default function CallWindowContent({call}: {call: Call}) {
  const updateCallState = useCallStore((state) => state.updateCallState);

  useSignalREvent("DirectCallDropped", (event: DirectCallDroppedEvent) => {
    if (call.id === event.callId) {
      updateCallState(call.id, "dropped");
    }
  });

  useSignalREvent("DirectCallEnded", (event: DirectCallEndedEvent) => {
    if (call.id === event.callId) {
      updateCallState(call.id, "ended");
    }
  });

  if (call.type === "outgoing_direct") {
    return <OutgoingCallWindowContent call={call}/>
  }

  if (call.type === "incoming_direct") {
    return <IncomingCallWindowContent call={call}/>
  }

  return null;
}