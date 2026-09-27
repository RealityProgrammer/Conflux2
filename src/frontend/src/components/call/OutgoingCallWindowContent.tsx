import {type OutgoingDirectCall, useCallStore} from "../../store/useCallStore.ts";
import CallWindowHeader from "./CallWindowHeader.tsx";
import {useSignalR} from "../../contexts/SignalRContext.tsx";
import UserAvatar from "../UserAvatar.tsx";
import {useAuth} from "../../contexts/AuthContext.tsx";
import {userService} from "../../api/userService.ts";
import IconButton from "../IconButton.tsx";
import {BsTelephoneXFill} from "react-icons/bs";
import {useTimeout} from "usehooks-ts";

export default function OutgoingCallWindowContent({call}: {call: OutgoingDirectCall}) {
  if (call.state === "dialing") {
    return <DialingPhase call={call}/>;
  }

  return null;
}

function DialingPhase({call}: {call: OutgoingDirectCall}) {
  const { userProfile } = useAuth();
  const endCall = useCallStore((state) => state.endCall);
  const { invokeSafely } = useSignalR();

  const handleCancelCall = async () => {
    endCall(call.sessionId);

    try {
      await invokeSafely("CancelDirectCall", call.calleeProfile.id);
    } catch (err) {
      console.error("Failed to cancel call:", err);
    }
  };

  useTimeout(() => {
    handleCancelCall();
  }, 60000);

  return (
    <>
      <CallWindowHeader title={`Dialing ${call.calleeProfile!.displayName}`}/>

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
          <IconButton theme="danger" onClick={handleCancelCall}>
            <BsTelephoneXFill className="size-8"/>
          </IconButton>
        </div>
      </div>
    </>
  );
}