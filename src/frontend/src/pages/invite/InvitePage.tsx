import {useNavigate, useParams} from "react-router";
import ServerAvatar from "../../components/ServerAvatar.tsx";
import {useState} from "react";
import Spinner from "../../components/Spinner.tsx";
import {invitationService} from "../../api/invitationService.ts";
import {BsCheckLg, BsCircleFill, BsExclamationTriangle} from "react-icons/bs";
import ErrorText from "../../components/ErrorText.tsx";
import {type GetInvitationSummaryQuery, useGetInvitationSummaryQuery} from "../../graphql/queries.ts";
import {InvitationStatus} from "../../graphql/types.ts";

export default function InvitePage() {
  const { inviteId } = useParams();
  const {isLoading, data, isError} = useGetInvitationSummaryQuery({id: inviteId!}, {enabled: !!inviteId});

  return (
    <div className="fixed bg-fixed inset-0 bg-gray-800">
      <div className="fixed left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-160 -translate-x-1/2 -translate-y-1/2 rounded-xl text-white bg-gray-600 p-4">
        {isLoading ? (
          <Spinner className="w-full size-8 fill-white"/>
        ) : !inviteId ? (
          <p className="text-center">Have you... uh... forgot to paste the invitation ID?</p>
        ) : isError || !data ? (
          <>
            <p className="text-center">An error seems to have occurred</p>
            <p className="text-gray-500 text-center mt-4 select-none">:(</p>
          </>
        ) : !data.invitationById ? (
          <>
            <p className="text-center">The invitation is invalid</p>
            <p className="text-gray-500 text-center mt-4 select-none">:(</p>
          </>
        ) : data.invitationById.status === InvitationStatus.Expired ? (
          <>
            <p className="text-center">The invitation is expired</p>
            <p className="text-gray-500 text-center mt-4 select-none">:(</p>
          </>
        ) : data.invitationById.status === InvitationStatus.MaxUsesReached ? (
          <>
            <p className="text-center">The invitation reached maximum usage</p>
            <p className="text-gray-500 text-center mt-4 select-none">:(</p>
          </>
        ) : data.invitationById.status === InvitationStatus.AlreadyJoinedServer ? (
          <>
            <p className="text-center">You've already joined the server.</p>
            <p className="text-gray-500 text-center mt-4 select-none">:)</p>
          </>
        ) : (
          <Invitation invitationId={inviteId!} summary={data.invitationById}/>
        )}
      </div>
    </div>
  );
}

function Invitation({summary, invitationId}: {
  summary: NonNullable<GetInvitationSummaryQuery['invitationById']>,
  invitationId: string
}) {
  const navigation = useNavigate();

  const [joinStatus, setJoinStatus] = useState<"nothing" | "joining" | "joined" | "error">("nothing");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const handleJoiningServer = async () => {
    if (joinStatus !== "nothing") return;

    setJoinStatus("joining");

    const response = await invitationService.joinServer(invitationId);

    if (response.success) {
      setJoinStatus("joined");

      const timeoutId = setTimeout(() => {
        navigation(`/lobby/servers/${encodeURIComponent(summary.communityServer!.id)}`);
      }, 3000);

      return () => clearTimeout(timeoutId);
    } else {
      setJoinStatus("error");
      setErrorMessage(response.error?.message ?? undefined);
    }
  }

  return (
    <div className="flex flex-row items-center gap-4">
      <ServerAvatar
        serverId={summary.status}
        hasAvatar={summary.communityServer!.hasAvatar}
        className="flex-none size-48 overflow-hidden rounded-full"
      />

      <section className="flex-1">
        <header>
          <p className="text-center">You're invited to...</p>
          <p className="text-center font-bold text-2xl">{summary.communityServer!.name}</p>
        </header>

        <div className="flex flex-row justify-center items-center mt-1">
          <span className="text-xs px-2 py-0.5 bg-white/15 rounded-full flex flex-row gap-1 justify-center items-center">
            <BsCircleFill className="fill-green-500 size-3 inline"/>

            Members: {summary.communityServer!.numMembers}
          </span>
        </div>

        <footer className="mt-6 flex flex-col justify-center items-center gap-2">
          <button className="relative button-theme-primary px-4 py-2 cursor-pointer rounded-md" onClick={handleJoiningServer}>
            <span className={`${joinStatus === "nothing" ? "visible" : "invisible"}`}>Join server</span>

            {joinStatus === "joining" && (
              <span className="absolute inset-0 flex justify-center items-center">
                <Spinner className="size-6 fill-white"/>
              </span>
            )}

            {joinStatus === "joined" && (
              <span className="absolute inset-0 flex justify-center items-center">
                <BsCheckLg className="size-6 fill-white"/>
              </span>
            )}

            {joinStatus === "error" && (
              <span className="absolute inset-0 flex justify-center items-center">
                <BsExclamationTriangle className="size-6 fill-white"/>
              </span>
            )}
          </button>

          {errorMessage && (
            <ErrorText className="block text-center">{errorMessage}</ErrorText>
          )}
        </footer>
      </section>
    </div>
  );
}