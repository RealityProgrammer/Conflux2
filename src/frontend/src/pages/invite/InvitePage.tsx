import { useNavigate, useParams } from "react-router";
import { useState } from "react";
import Spinner from "../../components/Spinner.tsx";
import { invitationService } from "../../api/invitationService.ts";
import { BsCheckLg, BsCircleFill, BsExclamationTriangle } from "react-icons/bs";
import ErrorText from "../../components/ErrorText.tsx";
import {
  type GetInvitationSummaryQuery,
  useGetInvitationSummaryQuery,
} from "../../graphql/queries.ts";
import { InvitationStatus } from "../../graphql/types.ts";
import { Avatar } from "../../components/Avatar.tsx";

export default function InvitePage() {
  const { inviteId } = useParams();
  const { isLoading, data, isError } = useGetInvitationSummaryQuery(
    { id: inviteId! },
    { enabled: !!inviteId },
  );

  return (
    <div className="fixed inset-0 bg-gray-800 bg-fixed">
      <div className="fixed top-1/2 left-1/2 max-h-[85vh] w-[90vw] max-w-160 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-gray-600 p-4 text-white">
        {isLoading ? (
          <Spinner className="size-8 w-full fill-white" />
        ) : !inviteId ? (
          <p className="text-center">
            Have you... uh... forgot to paste the invitation ID?
          </p>
        ) : isError || !data ? (
          <>
            <p className="text-center">An error seems to have occurred</p>
            <p className="mt-4 text-center text-gray-500 select-none">:(</p>
          </>
        ) : !data.invitation ? (
          <>
            <p className="text-center">The invitation is invalid</p>
            <p className="mt-4 text-center text-gray-500 select-none">:(</p>
          </>
        ) : data.invitation.status === InvitationStatus.Expired ? (
          <>
            <p className="text-center">The invitation is expired</p>
            <p className="mt-4 text-center text-gray-500 select-none">:(</p>
          </>
        ) : data.invitation.status === InvitationStatus.MaxUsesReached ? (
          <>
            <p className="text-center">The invitation reached maximum usage</p>
            <p className="mt-4 text-center text-gray-500 select-none">:(</p>
          </>
        ) : data.invitation.status === InvitationStatus.AlreadyJoinedServer ? (
          <>
            <p className="text-center">You've already joined the server.</p>
            <p className="mt-4 text-center text-gray-500 select-none">:)</p>
          </>
        ) : (
          <Invitation invitationId={inviteId!} summary={data.invitation} />
        )}
      </div>
    </div>
  );
}

function Invitation({
  summary,
  invitationId,
}: {
  summary: NonNullable<GetInvitationSummaryQuery["invitation"]>;
  invitationId: string;
}) {
  const navigation = useNavigate();

  const [joinStatus, setJoinStatus] = useState<
    "nothing" | "joining" | "joined" | "error"
  >("nothing");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined,
  );

  const handleJoiningServer = async () => {
    if (joinStatus !== "nothing") return;

    setJoinStatus("joining");

    const response = await invitationService.joinServer(invitationId);

    if (response.success) {
      setJoinStatus("joined");

      const timeoutId = setTimeout(() => {
        navigation(
          `/lobby/servers/${encodeURIComponent(summary.communityServer!.id)}`,
        );
      }, 3000);

      return () => clearTimeout(timeoutId);
    } else {
      setJoinStatus("error");
      setErrorMessage(response.error?.message ?? undefined);
    }
  };

  return (
    <div className="flex flex-row items-center gap-4">
      <Avatar.Server
        serverId={summary.communityServer?.id}
        version={summary.communityServer?.avatarVersion}
        className="size-48 flex-none overflow-hidden rounded-full"
      />

      <section className="flex-1">
        <header>
          <p className="text-center">You're invited to...</p>
          <p className="text-center text-2xl font-bold">
            {summary.communityServer!.name}
          </p>
        </header>

        <div className="mt-1 flex flex-row items-center justify-center">
          <span className="flex flex-row items-center justify-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">
            <BsCircleFill className="inline size-3 fill-green-500" />
            Members: {summary.communityServer!.numMembers}
          </span>
        </div>

        <footer className="mt-6 flex flex-col items-center justify-center gap-2">
          <button
            className="button-theme-primary panel-padding relative cursor-pointer rounded-md"
            onClick={handleJoiningServer}
          >
            <span
              className={`${joinStatus === "nothing" ? "visible" : "invisible"}`}
            >
              Join server
            </span>

            {joinStatus === "joining" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Spinner className="size-6 fill-white" />
              </span>
            )}

            {joinStatus === "joined" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <BsCheckLg className="size-6 fill-white" />
              </span>
            )}

            {joinStatus === "error" && (
              <span className="absolute inset-0 flex items-center justify-center">
                <BsExclamationTriangle className="size-6 fill-white" />
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
