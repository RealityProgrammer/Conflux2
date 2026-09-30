import {useCallStore} from "../../store/useCallStore.ts";
import CallWindowHeader from "./CallWindowHeader.tsx";
import OutgoingCallWindowContent from "./OutgoingCallWindowContent.tsx";
import IncomingCallWindowContent from "./IncomingCallWindowContent.tsx";

export default function CallWindowContent({callSessionId}: {callSessionId: string}) {
  const call = useCallStore((state) => state.call);

  if (!call || call.sessionId !== callSessionId) return null;

  if (call.type === "outgoing_direct") {
    return <OutgoingCallWindowContent call={call}/>
  }

  if (call.type === "incoming_direct") {
    return <IncomingCallWindowContent call={call}/>
  }

  return null;
}