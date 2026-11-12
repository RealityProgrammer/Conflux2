import {ScrollArea} from "radix-ui";
import {conversationService} from "../../api/conversationService.ts";
import {BsMusicNote} from "react-icons/bs";
import type {MessageAttachmentDto} from "../../api/types.ts";

export interface MessageAttachmentsProps {
  attachments: MessageAttachmentDto[];
  onAttachmentClick: (index: number) => void;
}

export default function MessageAttachments({
  attachments,
  onAttachmentClick,
}: MessageAttachmentsProps) {
  return (
    <ScrollArea.Root className={`w-full overflow-hidden group mt-1`}>
      <ScrollArea.Viewport className="">
        <div className="flex flex-row gap-1 w-max h-full group-has-data-[state=visible]:pb-3">
          {attachments.map((attachment, index) => (
            <div
              key={attachment.id}
              className="flex-none overflow-hidden relative group size-40 cursor-pointer"
            >
              {attachment.type.startsWith("image") ? (
                <img
                  src={conversationService.getAttachmentViewUrl(attachment.id)}
                  alt="attachment"
                  className="object-cover size-full"
                  loading="lazy"
                  onClick={() => onAttachmentClick(index)}
                />
              ) : attachment.type.startsWith("video") ? (
                <video
                  src={conversationService.getAttachmentViewUrl(attachment.id)}
                  className="object-cover size-full"
                  autoPlay={false}
                  onClick={() => onAttachmentClick(index)}
                />
              ) : attachment.type.startsWith("audio") ? (
                <div
                  className="flex flex-row justify-center items-center size-full"
                  onClick={() => onAttachmentClick(index)}
                >
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
          className="relative flex-1 rounded-full bg-gray-400"/>
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}