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

  // const { userProfile } = useAuth();
  // const beginDialingDirectCall = useCallStore((state) => state.beginDialingDirectCall);
  // const endCall = useCallStore((state) => state.endCall);
  //
  // const { invokeSafely } = useSignalR();
  //
  // const initRequested = useRef(false);
  //
  // useEffect(() => {
  //   if (call?.state === "initialize" && !initRequested.current) {
  //     initRequested.current = true;
  //
  //     (async () => {
  //       try {
  //         const result: DirectCallContext = await invokeSafely("StartDirectCall", call.calleeId);
  //
  //         switch (result.result) {
  //           case CallResult.Success:
  //             beginDialingDirectCall(callSessionId, result.calleeProfile!);
  //             break;
  //
  //           case CallResult.Unfriended:
  //
  //             break;
  //
  //           case CallResult.Unfriended:
  //
  //             break;
  //         }
  //       } catch (err) {
  //         console.error("Failed to start direct call:", err);
  //       }
  //     })();
  //   }
  // }, [call?.state, call?.calleeId, callSessionId, invokeSafely, beginDialingDirectCall]);
  //
  // const handleEndCall = () => {
  //   endCall(callSessionId);
  // };
  //
  // return (
  //   <>
  //     <header
  //       className="drag-handle bg-gray-775 px-3 py-2 flex flex-row justify-between items-center select-none border-b-2 border-gray-600"
  //     >
  //       <span className="flex-1 text-gray-200 text-sm font-semibold truncate pointer-events-none animate-pulse">
  //         { !call ? (
  //           <span>Can't find the right call...</span>
  //         ) : call.state === "initialize" ? (
  //           <span className="animate-pulse">Initializing...</span>
  //         ) : call.state === "initialize_error" ? (
  //           "Something happened..."
  //         ) : call.state === "dialing" ? (
  //           `Dialing ${call.calleeProfile?.displayName}...`
  //         ) : (
  //           "Insert title here"
  //         )}
  //       </span>
  //
  //       <div className="flex-none flex gap-3 pointer-events-auto cursor-default">
  //         <IconButton theme="default">
  //           <FaMinus className="size-4"/>
  //         </IconButton>
  //
  //         <IconButton theme="default">
  //           <FaExpand className="size-4"/>
  //         </IconButton>
  //
  //         <IconButton theme="danger" onClick={handleEndCall}>
  //           <BsTelephoneXFill className="size-4"/>
  //         </IconButton>
  //       </div>
  //     </header>
  //
  //     <section className="flex-1 bg-black relative">
  //       {call && (call.state === "initialize" ? (
  //         <div className="size-full flex flex-col justify-center items-center">
  //           <Spinner className="size-12 fill-white"/>
  //         </div>
  //       ) : call.state === "initialize_error" ? (
  //         <div className="size-full flex flex-col justify-center items-center gap-3">
  //           <BsExclamationTriangle className="size-12 fill-white"/>
  //           <p>Failed to start the call.</p>
  //         </div>
  //       ) : call.state === "dialing" ? (
  //         <DialingScene
  //           callerAvatarSrc={userProfile?.avatarRevision ? userService.getAvatarUrl(userProfile.id, userProfile.avatarRevision) : undefined}
  //           calleeAvatarSrc={call?.calleeProfile?.avatarRevision ? userService.getAvatarUrl(call.calleeProfile.id, call.calleeProfile.avatarRevision) : undefined}
  //         />
  //       ) : (
  //           <p>state: {call.state}</p>
  //       ))}
  //     </section>
  //   </>
  // );
}