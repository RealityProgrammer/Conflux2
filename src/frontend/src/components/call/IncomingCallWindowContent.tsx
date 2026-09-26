import {type IncomingDirectCall, useCallStore} from "../../store/useCallStore.ts";
import CallWindowHeader from "./CallWindowHeader.tsx";
import UserAvatar from "../UserAvatar.tsx";
import IconButton from "../IconButton.tsx";
import {BsTelephoneInbound, BsTelephoneInboundFill, BsTelephoneXFill} from "react-icons/bs";
import {userService} from "../../api/userService.ts";

export default function IncomingCallWindowContent({call}: {call: IncomingDirectCall}) {
  if (call.state === "incoming") {
    return <IncomingPhase call={call}/>
  }

  return null;
}

function IncomingPhase({call}: {call: IncomingDirectCall}) {
  const endCall = useCallStore((state) => state.endCall);

  return (
    <>
      <CallWindowHeader title="Incoming call" onEndCall={() => {
        endCall(call.sessionId);
      }}/>

      <section className="flex-1 bg-black flex flex-col justify-center items-center gap-2 @container-size relative">
        <UserAvatar
          src={call.callerProfile.avatarRevision ? userService.getAvatarUrl(call.callerProfile.id, call.callerProfile.avatarRevision) : undefined}
          alt="Caller avatar"
          className="w-[min(25cqw,25cqh)]"
        />

        <p>{call.callerProfile.displayName}</p>

        <div className="absolute bottom-2 flex flex-row gap-4 p-2 bg-gray-650 border-2 border-gray-600 rounded-lg">
          <IconButton theme="danger" className="">
            <BsTelephoneXFill className="size-8"/>
          </IconButton>

          <IconButton theme="success" className="">
            <BsTelephoneInboundFill className="size-8"/>
          </IconButton>
        </div>
      </section>
    </>
  )
}