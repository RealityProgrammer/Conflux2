import {ScrollArea} from "radix-ui";
import {messageService} from "../../api/messageService.ts";
import {BsMusicNote} from "react-icons/bs";
import type {Attachment} from "../../api/responses.ts";

export interface MessageAttachmentsProps {
  attachments: Attachment[];
  onAttachmentClick: (index: number) => void;
}

export default function MessageAttachments({
  attachments,
  onAttachmentClick,
}: MessageAttachmentsProps) {
  return (
    <ScrollArea.Root className={`h-32 w-full overflow-hidden group`}>
      <ScrollArea.Viewport className="size-full [&>div]:flex! [&>div]:h-full [&>div]:flex-col">
        <div className="flex flex-row gap-1 w-max h-full group-has-data-[state=visible]:pb-3">
          {attachments.map((attachment, index) => (
            <div
              key={attachment.id}
              className="flex-none overflow-hidden relative group h-full aspect-square rounded-md border border-gray-500 cursor-pointer"
              onClick={() => onAttachmentClick(index)}
            >
              {attachment.type.startsWith("image") ? (
                <img
                  src={messageService.getAttachmentUrl(attachment.id, false)}
                  alt="attachment"
                  className="object-cover size-full"
                  loading="lazy"
                />
              ) : attachment.type.startsWith("video") ? (
                <video
                  src={messageService.getAttachmentUrl(attachment.id, false)}
                  className="object-cover size-full"
                  autoPlay={false}
                />
              ) : attachment.type.startsWith("audio") ? (
                <div className="flex flex-row justify-center items-center size-full">
                  <BsMusicNote className="size-16 fill-white"/>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </ScrollArea.Viewport>

      <ScrollArea.Scrollbar
        className="flex flex-col h-2 touch-none select-none p-0.5 transition-colors duration-160 ease-out hover-highlight"
        orientation="horizontal">
        <ScrollArea.Thumb
          className="relative flex-1 rounded-[10px] bg-gray-400 before:absolute before:left-1/2 before:top-1/2 before:size-full before:min-h-11 before:min-w-11 before:-translate-x-1/2 before:-translate-y-1/2"/>
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}