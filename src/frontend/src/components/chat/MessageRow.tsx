import UserAvatar from "../UserAvatar.tsx";
import DateTimeText from "../DateTimeText.tsx";
import {formatDate} from "date-fns";
import {BsPaperclip} from "react-icons/bs";
import type {ReactNode} from "react";

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
            className="flex-none mt-1 size-10 select-none items-center justify-center overflow-hidden rounded-full align-middle cursor-pointer"
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">
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

export const MessageRow = {
  Reply,
  Row
};