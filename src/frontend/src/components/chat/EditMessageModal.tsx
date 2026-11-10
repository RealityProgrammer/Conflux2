import type {TimelineMessageDto} from "../../api/types.ts";
import {useMediaGalleryStore} from "../../store/useMediaGalleryStore.ts";
import {useRef, useState} from "react";
import MessageTextboxEditor, {type MessageTextboxEditorRef} from "./MessageTextboxEditor.tsx";
import Dialog from "../Dialog.tsx";
import {BsWrenchAdjustable} from "react-icons/bs";
import {Dialog as RadixDialog, Label, ScrollArea} from "radix-ui";
import {conversationService} from "../../api/conversationService.ts";
import {Attachment} from "./Attachment.tsx";
import {FaFileCirclePlus, FaRepeat, FaXmark} from "react-icons/fa6";
import MessageAttachmentInput from "./MessageAttachmentInput.tsx";

interface EditMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalMessage: TimelineMessageDto | undefined;
  handleSubmit: (newBody: string | null, removeAttachmentIds: string[]) => void;
}

export default function EditMessageModal({
  open,
  onOpenChange,
  originalMessage,
  handleSubmit,
}: EditMessageModalProps) {
  const setGalleryElements = useMediaGalleryStore((state) => state.setElements);

  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const textboxEditorRef = useRef<MessageTextboxEditorRef | null>(null);
  const [removeAttachmentIds, setRemoveAttachmentIds] = useState<string[]>([]);

  const handleToggleRemoveCurrentAttachment = (attachmentId: string) => {
    setRemoveAttachmentIds((prev: string[]): string[] => {
      if (prev.includes(attachmentId)) {
        return prev.filter(v => v !== attachmentId);
      } else {
        return [...prev, attachmentId];
      }
    });
  };

  const handleEditSubmit = () => {
    if (!textboxEditorRef.current) return;
    handleSubmit(textboxEditorRef.current.convertToMarkdownString(), removeAttachmentIds);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Message"
      subtitle="Should have gave it a thought first..."
      headerIcon={(<BsWrenchAdjustable className="size-10 fill-white"/>)}
      contentClassName="centered-dialog w-3xl rounded-xl text-white bg-gray-650 outline-none"
      footerContent={(
        <div className="w-full flex flex-row justify-end p-3 gap-3">
          <RadixDialog.Close
            type="button"
            className="cursor-pointer basis-20 outline-none"
          >
            Cancel
          </RadixDialog.Close>

          <button
            className="button-theme-primary cursor-pointer px-3 py-2 rounded-md"
            onClick={handleEditSubmit}
          >
            Save Message
          </button>
        </div>
      )}
    >
      {originalMessage && (
        <div className="px-3 py-2">
          <Label.Root className="label mb-1 block">Body</Label.Root>

          <MessageTextboxEditor
            ref={textboxEditorRef}
            key={open ? originalMessage.id : undefined}
            initialValue={originalMessage.body ?? ""}
            onSuggestionChange={() => {}}
          />

          <Label.Root className="label mb-1 mt-2 block">Attachments</Label.Root>

          <ScrollArea.Root className="w-full">
            <ScrollArea.Viewport className="size-full pb-3">
              <div className="flex flex-row gap-4 items-center">
                {originalMessage.attachments && originalMessage.attachments.length > 0 && originalMessage.attachments.map((attachment, index) => {
                  const viewUrl = conversationService.getAttachmentViewUrl(attachment.id);
                  const isBeingRemoved = removeAttachmentIds.includes(attachment.id);

                  return (
                    <div key={index} className="relative shrink-0 h-13">
                      <Attachment.FilePill
                        key={index}
                        file={{
                          type: attachment.type,
                          src: viewUrl,
                          fileName: attachment.name
                        }}
                        className={`h-full border-2 rounded-md overflow-hidden pr-4 max-w-64 cursor-pointer ${isBeingRemoved ? "bg-red-500/30 border-red-600" : "bg-none border-gray-600"}`}
                        onClick={() => {
                          setGalleryElements(originalMessage.attachments!.map(attachment => ({
                            id: attachment.id,
                            fileName: attachment.name,
                            mediaType: attachment.type,
                            src: conversationService.getAttachmentViewUrl(attachment.id),
                          })), index, {});
                        }}
                      />

                      <button
                        className={`
                          absolute border-2 rounded-full p-1 right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-pointer bg-gray-700
                          ${isBeingRemoved ? "border-red-600" : "border-gray-600"}
                        `}
                        onClick={() => handleToggleRemoveCurrentAttachment(attachment.id)}
                      >
                        {isBeingRemoved ? (
                          <FaRepeat className="size-4 fill-white"/>
                        ) : (
                          <FaXmark className="size-4 fill-white"/>
                        )}
                      </button>
                    </div>
                  );
                })}

                <button
                  className="button-theme-primary p-2 aspect-square rounded-md cursor-pointer"
                  onClick={() => {
                    attachmentInputRef.current?.click();
                  }}
                >
                  <FaFileCirclePlus className="size-6 fill-white"/>
                </button>

                <MessageAttachmentInput
                  ref={attachmentInputRef}
                  onChange={(e) => {

                  }}
                />
              </div>
            </ScrollArea.Viewport>

            <ScrollArea.Scrollbar
              className="flex flex-col h-2 touch-none select-none p-0.5 transition-colors duration-160 ease-out hover-highlight"
              orientation="horizontal"
            >
              <ScrollArea.Thumb
                className="relative flex-1 rounded-full bg-gray-400"
              />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>
        </div>
      )}
    </Dialog>
  );
}