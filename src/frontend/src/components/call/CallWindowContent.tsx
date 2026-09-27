import {useCallStore} from "../../store/useCallStore.ts";
import CallWindowHeader from "./CallWindowHeader.tsx";
import OutgoingCallWindowContent from "./OutgoingCallWindowContent.tsx";
import IncomingCallWindowContent from "./IncomingCallWindowContent.tsx";

export default function CallWindowContent({callSessionId}: {callSessionId: string}) {
  const calls = useCallStore((state) => state.calls);
  const call = calls.find((c) => c.sessionId === callSessionId)!;

  if (call.type === "outgoing_direct") {
    return <OutgoingCallWindowContent call={call}/>
  }

  if (call.type === "incoming_direct") {
    return <IncomingCallWindowContent call={call}/>
  }

  return null;
}