import { ScrollArea } from "radix-ui";
import { conversationService } from "../../api/conversationService.ts";
import { BsMusicNote } from "react-icons/bs";
import type { MessageAttachmentDto } from "../../api/types.ts";

export interface MessageAttachmentsProps {
  attachments: MessageAttachmentDto[];
  onAttachmentClick: (index: number) => void;
}

export default function MessageAttachments({ attachments, onAttachmentClick }: MessageAttachmentsProps) {
  return (
    <ScrollArea.Root className={`group mt-1 w-full overflow-hidden`}>
      <ScrollArea.Viewport className="">
        <div className="flex h-full w-max flex-row gap-1 group-has-data-[state=visible]:pb-3">
          {attachments.map((attachment, index) => (
            <div
              key={attachment.id}
              className="group relative size-40 flex-none cursor-pointer overflow-hidden"
            >
              {attachment.contentType.startsWith("image") ? (
                <img
                  src={conversationService.getAttachmentViewUrl(attachment.id)}
                  alt="attachment"
                  className="size-full object-cover"
                  loading="lazy"
                  onClick={() => onAttachmentClick(index)}
                />
              ) : attachment.contentType.startsWith("video") ? (
                <video
                  src={conversationService.getAttachmentViewUrl(attachment.id)}
                  className="size-full object-cover"
                  autoPlay={false}
                  onClick={() => onAttachmentClick(index)}
                />
              ) : attachment.contentType.startsWith("audio") ? (
                <div
                  className="flex size-full flex-row items-center justify-center"
                  onClick={() => onAttachmentClick(index)}
                >
                  <BsMusicNote className="size-16 fill-white" />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </ScrollArea.Viewport>

      <ScrollArea.Scrollbar
        className="hover-highlight flex h-2 touch-none flex-col p-0.5 transition-colors duration-160 ease-out select-none"
        orientation="horizontal"
      >
        <ScrollArea.Thumb className="relative flex-1 rounded-full bg-gray-400" />
      </ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}
