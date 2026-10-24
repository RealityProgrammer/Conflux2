import {useCallStore} from "../../store/useCallStore.ts";
import useSignalREvent from "../../hooks/useSignalREvent.ts";
import type {IncomingCallEvent} from "../../api/events.ts";
import CallWindow from "./CallWindow.tsx";
import {useEffect} from "react";
import type {GetIncomingDirectCallQueryResult, ServiceResponse} from "../../api/types.ts";
import {directConversationService} from "../../api/directConversationService.ts";

export default function CallOverlay() {
  const call = useCallStore((state) => state.call);
  const startIncomingDirectCall = useCallStore((state) => state.startIncomingDirectCall);
  
  // check if there is ongoing "incoming call" if callee refresh page while having an incoming call
  useEffect(() => {
    (async () => {
      try {
        const response: ServiceResponse<GetIncomingDirectCallQueryResult> = await directConversationService.getIncomingCall();

        if (response.success && response.data) {
          startIncomingDirectCall(response.data.callId, {
            ...response.data.callerProfile,
            avatar: response.data.callerProfile.avatarVersion ? {
              version: response.data.callerProfile.avatarVersion,
            } : null,
          });
        }
      } catch (err) {
        console.log("Failed to get current call:", err);
      }
    })();
  }, []);

  useSignalREvent("IncomingDirectCall", (event: IncomingCallEvent) => {
    startIncomingDirectCall(event.callId, event.callerProfile);
  });

  return (
    <section className="fixed inset-0 z-2000 pointer-events-none overflow-hidden text-white">
      {call && (
        <CallWindow key={call.id} call={call}/>
      )}
    </section>
  )
}