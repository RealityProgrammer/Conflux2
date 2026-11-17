import DateTimeText from "../DateTimeText.tsx";
import { formatDate } from "date-fns";
import { BsPaperclip } from "react-icons/bs";
import type { ReactNode } from "react";
import usePositionBasedRandom from "../../hooks/usePositionBasedRandom.ts";
import { distribute } from "../../utils/random.ts";
import { useChatContainerContext } from "../../contexts/ChatContainerContext.tsx";
import { Avatar } from "../Avatar.tsx";

interface ReplyProps {
  messageId: string;
  senderDisplayName: string;
  attachmentCount: number;
  body: string | null;
}

function Reply({
  messageId,
  senderDisplayName,
  attachmentCount,
  body,
}: ReplyProps) {
  const { requestJump } = useChatContainerContext();

  return (
    <div className="ml-13 text-xs">
      <p
        className="line-clamp-2 w-fit max-w-full cursor-pointer wrap-break-word text-gray-300 hover:text-white"
        onClick={() => requestJump(messageId)}
      >
        <span className="font-semibold">{senderDisplayName ?? "???"}</span>{" "}
        sent:{" "}
        {attachmentCount > 0 && (
          <>
            <span className="mx-1 inline-flex items-center align-text-bottom">
              <BsPaperclip className="mr-0.5 size-3.5" />
              <span className="text-[10px] leading-none">
                {attachmentCount}
              </span>
            </span>
          </>
        )}
        {body && body.length > 0 && <> {body}</>}
      </p>
    </div>
  );
}

interface RowProps {
  header:
    | {
        senderId?: string;
        senderAvatarVersion: number | null | undefined;
        senderDisplayName: string;
        avatarAlt?: string;
      }
    | undefined;
  date: Date;
  children: ReactNode;
}

function Row({ header, date, children }: RowProps) {
  return (
    <div className="group flex w-full flex-row gap-3">
      {!!header ? (
        <>
          <Avatar.User
            userId={header.senderId}
            version={header.senderAvatarVersion}
            alt={header.avatarAlt}
            className="mt-0.75 size-10 flex-none cursor-pointer overflow-hidden rounded-full select-none"
          />

          <div className="min-w-0 flex-1">
            <p className="mb-0.5 text-sm font-semibold text-white">
              {header.senderDisplayName}{" "}
              <DateTimeText
                value={date}
                relative={false}
                className="hidden text-xs font-normal text-gray-400 select-none group-hover:inline"
              />
            </p>

            {children}
          </div>
        </>
      ) : (
        <>
          <span className="invisible mt-1 inline-flex w-10 flex-none items-center justify-center self-start text-xs font-normal text-gray-400 select-none group-hover:visible">
            {formatDate(date, "HH:mm")}
          </span>

          {children}
        </>
      )}
    </div>
  );
}

function HeaderSkeleton({ children }: { children: ReactNode }) {
  const rand = usePositionBasedRandom();

  return (
    <div className="flex w-full flex-row gap-3">
      <div className="size-10 flex-none animate-pulse rounded-full bg-white/10"></div>

      <div className="min-w-0 flex-1">
        <div
          className="mb-1 h-4.5 animate-pulse rounded-full bg-white/10"
          style={{ width: `${15 + rand * 40}%` }}
        ></div>

        {children}
      </div>
    </div>
  );
}

function BodySkeleton() {
  const rand1 = usePositionBasedRandom();
  const rand2 = usePositionBasedRandom();

  const numFullRow = Math.round(distribute(rand1, 1) * 4);
  const lastRowWidthPercentage = 20 + rand2 * 50;

  return (
    <div className="flex-1 space-y-1">
      {[...new Array(numFullRow).keys()].map((_, index) => (
        <div
          key={index}
          className="h-4.5 animate-pulse rounded-full bg-white/10"
        ></div>
      ))}

      <div
        className="h-4.5 animate-pulse rounded-full bg-white/10"
        style={{ width: `${lastRowWidthPercentage}%` }}
      ></div>
    </div>
  );
}

export const MessageRow = {
  Reply,
  Row,
  HeaderSkeleton,
  BodySkeleton,
};
