import DateTimeText from "../DateTimeText.tsx";
import {formatDate} from "date-fns";
import {BsPaperclip} from "react-icons/bs";
import type {ReactNode} from "react";
import usePositionBasedRandom from "../../hooks/usePositionBasedRandom.ts";
import {distribute} from "../../utils/random.ts";
import {useChatContainerContext} from "../../contexts/ChatContainerContext.tsx";
import {Avatar} from "../Avatar.tsx";
import {Emoji} from "../Emoji.tsx";

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
  body
}: ReplyProps) {
  const { requestJump } = useChatContainerContext();

  return (
    <div className="text-xs ml-13">
      <p
        className="line-clamp-2 wrap-break-word w-fit max-w-full cursor-pointer text-gray-300 hover:text-white"
        onClick={() => requestJump(messageId)}
      >
        <span className="font-semibold">{senderDisplayName ?? "???"}</span>
        {" "}sent:{" "}
        {attachmentCount > 0 && (
          <>
            <span className="inline-flex items-center align-text-bottom mx-1">
              <BsPaperclip className="size-3.5 mr-0.5" />
              <span className="leading-none text-[10px]">{attachmentCount}</span>
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
    senderId?: string;
    senderAvatarVersion: number | null | undefined;
    senderDisplayName: string;
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
    <div className="flex flex-row gap-3 w-full group">
      {!!header ? (
        <>
          <Avatar.User
            userId={header.senderId}
            version={header.senderAvatarVersion}
            alt={header.avatarAlt}
            className="flex-none size-10 select-none overflow-hidden rounded-full cursor-pointer mt-0.75"
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

interface ReactionsProps {
  reactionsCountsEntries: [string, number][];
  userReactionKeys: string[];
}

function Reactions({
  reactionsCountsEntries,
  userReactionKeys
}: ReactionsProps) {
  return (
    <>
      {reactionsCountsEntries.length > 0 && (
        <ul className="flex flex-row flex-wrap gap-1 text-sm">
          {reactionsCountsEntries.map(([reactionKey, reactionCount]) => {
            const serverEmojiId = reactionKey.startsWith("emoji.") ? reactionKey.slice("emoji.".length) : undefined;
            const hasReacted = userReactionKeys && userReactionKeys.includes(reactionKey);

            return (
              <li
                key={reactionKey}
                className={`flex-none flex flex-row gap-1 items-center border-2 ${hasReacted ? "border-gray-500 bg-white/10" : "border-gray-600 bg-black/8"} hover-highlight rounded-md px-1.5 py-0.75 select-none cursor-pointer`}
                onClick={() => {

                }}
              >
                {serverEmojiId ? (
                  <Emoji.Root
                    emojiId={serverEmojiId}
                    className="size-6"
                  />
                ) : (
                  <div className="size-6 bg-red-500"></div>
                )}

                {reactionCount}
              </li>
            );
          })}
        </ul>
      )}
    </>
  )
}

export const MessageRow = {
  Reply,
  Row,
  HeaderSkeleton,
  BodySkeleton
};