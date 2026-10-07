import UserAvatar from "../UserAvatar.tsx";
import DateTimeText from "../DateTimeText.tsx";
import {formatDate} from "date-fns";
import {BsPaperclip} from "react-icons/bs";
import type {ReactNode} from "react";
import usePositionBasedRandom from "../../hooks/usePositionBasedRandom.ts";
import {distribute} from "../../utils/random.ts";

interface ReplyProps {
  senderDisplayName: string;
  attachmentCount: number;
  body: string | null;
}

function Reply({
  senderDisplayName,
  attachmentCount,
  body
}: ReplyProps) {
  return (
    <div className="text-xs ml-13">
      <p className="line-clamp-2 wrap-break-word">
        <span className="font-semibold">{senderDisplayName ?? "???"}</span>
        {" "}sent:{" "}
        {attachmentCount > 0 && (
          <>
            <span className="inline-flex items-center align-text-bottom mx-1 text-gray-300">
              <BsPaperclip className="size-3.5 fill-white mr-0.5" />
              <span className="leading-none text-[10px]">4</span>
            </span>
          </>
        )}

        {body && body.length > 0 && (
          <>
            {" "}
            {body}
          </>
        )}
      </p>
    </div>
  );
}

interface RowProps {
  header: {
    senderDisplayName: string;
    avatarSrc?: string;
    avatarAlt?: string;
  } | undefined;
  date: Date;
  children: ReactNode;
}

function Row({
  header,
  date,
  children,
}: RowProps) {
  return (
    <div className="flex flex-row gap-3 w-full">
      {!!header ? (
        <>
          <UserAvatar
            src={header.avatarSrc}
            alt={header.avatarAlt}
            className="flex-none size-10 select-none overflow-hidden rounded-full cursor-pointer"
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white mb-0.5">
              {header.senderDisplayName}
              {" "}
              <DateTimeText value={date} relative={false} className="select-none font-normal text-xs text-gray-400 hidden group-hover:inline"/>
            </p>

            {children}
          </div>
        </>
      ) : (
        <>
          <span className="select-none flex-none w-10 self-start mt-1 inline-flex justify-center items-center font-normal text-xs text-gray-400 invisible group-hover:visible">
            {formatDate(date, "HH:mm")}
          </span>

          {children}
        </>
      )}
    </div>
  );
}

function HeaderSkeleton({children}: {children: ReactNode}) {
  const rand = usePositionBasedRandom();

  return (
    <div className="flex flex-row gap-3 w-full">
      <div className="flex-none size-10 rounded-full animate-pulse bg-white/10"></div>

      <div className="flex-1 min-w-0">
        <div className="mb-1 h-4.5 rounded-full animate-pulse bg-white/10" style={{width: `${15 + rand * 40}%`}}></div>

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
        <div key={index} className="h-4.5 rounded-full animate-pulse bg-white/10"></div>
      ))}

      <div className="h-4.5 rounded-full animate-pulse bg-white/10" style={{width: `${lastRowWidthPercentage}%`}}></div>
    </div>
  )
}

export const MessageRow = {
  Reply,
  Row,
  HeaderSkeleton,
  BodySkeleton
};