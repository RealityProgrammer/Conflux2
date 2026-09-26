import {type OutgoingDirectCall, useCallStore} from "../../store/useCallStore.ts";
import CallWindowHeader from "./CallWindowHeader.tsx";
import {useEffect, useRef} from "react";
import {CallResult, type DirectCallContext} from "../../api/types.ts";
import {useSignalR} from "../../contexts/SignalRContext.tsx";
import UserAvatar from "../UserAvatar.tsx";
import {useAuth} from "../../contexts/AuthContext.tsx";
import {userService} from "../../api/userService.ts";
import IconButton from "../IconButton.tsx";
import {BsTelephoneInboundFill, BsTelephoneXFill} from "react-icons/bs";

export default function OutgoingCallWindowContent({call}: {call: OutgoingDirectCall}) {
  if (call.state === "initialize") {
    return <InitializePhase call={call}/>
  }

  if (call.state === "dialing") {
    return (
      <DialingPhase call={call}/>
    );
  }

  return null;
}

function InitializePhase({call}: {call: OutgoingDirectCall}) {
  const beginDialingDirectCall = useCallStore((state) => state.beginDialingDirectCall);
  const endCall = useCallStore((state) => state.endCall);

  const { invokeSafely } = useSignalR();
  const initRequested = useRef(false);

  useEffect(() => {
    if (call?.state === "initialize" && !initRequested.current) {
      initRequested.current = true;

      (async () => {
        try {
          const result: DirectCallContext = await invokeSafely("StartDirectCall", call.calleeId);

          switch (result.result) {
            case CallResult.Success:
              beginDialingDirectCall(call.sessionId, result.calleeProfile!);
              break;

            case CallResult.Unfriended:

              break;

            case CallResult.Unfriended:

              break;
          }
        } catch (err) {
          console.error("Failed to start direct call:", err);
        }
      })();
    }
  }, [call?.state, call?.calleeId, call.sessionId, invokeSafely, beginDialingDirectCall]);

  return (
    <>
      <CallWindowHeader title="Initializing call..." onEndCall={() => { endCall(call.sessionId) }}/>
      <section className="flex-1 bg-black"></section>
    </>
  );
}

function DialingPhase({call}: {call: OutgoingDirectCall}) {
  const { userProfile } = useAuth();
  const endCall = useCallStore((state) => state.endCall);

  return (
    <>
      <CallWindowHeader title={`Dialing ${call.calleeProfile!.displayName}`} onEndCall={() => { endCall(call.sessionId) }}/>

      <div className="flex-1 bg-black p-6 @container-size relative flex flex-col justify-center items-center">
        <div className="size-full flex flex-row justify-center items-center gap-[10%]">
          <UserAvatar
            src={userProfile?.avatarRevision ? userService.getAvatarUrl(userProfile.id, userProfile.avatarRevision) : undefined}
            alt="Caller avatar"
            className="w-[min(calc(50cqw-0.75rem),50cqh)] border-2 border-gray-600"
          />

          <UserAvatar
            src={call.calleeProfile?.avatarRevision ? userService.getAvatarUrl(call.calleeProfile.id, call.calleeProfile.avatarRevision) : undefined}
            alt="Callee avatar"
            className="w-[min(calc(50cqw-0.75rem),50cqh)] border-2 border-gray-600"
          />
        </div>

        <div className="absolute bottom-2 flex flex-row gap-4 p-2 bg-gray-650 border-2 border-gray-600 rounded-lg">
          <IconButton theme="danger" className="">
            <BsTelephoneXFill className="size-8"/>
          </IconButton>
        </div>
      </div>
    </>
  );
}