import {type IncomingDirectCall, useCallStore} from "../../store/useCallStore.ts";
import CallWindowHeader from "./CallWindowHeader.tsx";
import UserAvatar from "../UserAvatar.tsx";
import IconButton from "../IconButton.tsx";
import {BsTelephoneInbound, BsTelephoneInboundFill, BsTelephoneXFill} from "react-icons/bs";
import {userService} from "../../api/userService.ts";
import {useSignalR} from "../../contexts/SignalRContext.tsx";
import {useState} from "react";

export default function IncomingCallWindowContent({call}: {call: IncomingDirectCall}) {
  if (call.state === "incoming") {
    return <IncomingPhase call={call}/>
  }

  return null;
}

function IncomingPhase({call}: {call: IncomingDirectCall}) {
  const markCallAsConnected = useCallStore((state) => state.markCallAsConnected);
  const endCall = useCallStore((state) => state.endCall);
  const { invokeSafely } = useSignalR();
  const [action, setAction] = useState<"none" | "decline" | "accept">("none");

  const handleDeclineCall = async () => {
    if (action !== "none") return;
    setAction("decline");

    endCall(call.sessionId);

    try {
      await invokeSafely("CancelDirectCall", call.callerProfile.id);
    } catch (err) {
      console.error("Failed to cancel call:", err);
    }
  };

  const handleAcceptCall = async () => {
    if (action !== "none") return;
    setAction("accept");

    try {
      await invokeSafely("AcceptDirectCall", call.callerProfile.id);

      markCallAsConnected(call.sessionId);
    } catch (err) {
      console.error("Failed to accept call:", err);
    }
  }

  return (
    <>
      <CallWindowHeader title="Incoming call"/>

      <section className="flex-1 bg-black flex flex-col justify-center items-center gap-2 @container-size relative">
        <UserAvatar
          src={call.callerProfile.avatarRevision ? userService.getAvatarUrl(call.callerProfile.id, call.callerProfile.avatarRevision) : undefined}
          alt="Caller avatar"
          className="w-[min(25cqw,25cqh)]"
        />

        <p>{call.callerProfile.displayName}</p>

        <div className="absolute bottom-2 flex flex-row gap-4 p-2 bg-gray-650 border-2 border-gray-600 rounded-lg">
          <IconButton className="size-8" theme="danger" onClick={handleDeclineCall} disabled={action !== "none"}>
            <BsTelephoneXFill className="size-8"/>
          </IconButton>

          <IconButton className="size-8" theme="success" onClick={handleAcceptCall} disabled={action !== "none"}>
            <BsTelephoneInboundFill className="size-8"/>
          </IconButton>
        </div>
      </section>
    </>
  )
}