import type {TimelineMessageDto} from "../../api/types.ts";
import {type MediaGalleryElement, useMediaGalleryStore} from "../../store/useMediaGalleryStore.ts";
import {type ChangeEvent, useEffect, useRef, useState} from "react";
import MessageTextboxEditor, {type MessageTextboxEditorRef, type SuggestionData} from "./MessageTextboxEditor.tsx";
import Dialog from "../Dialog.tsx";
import {BsWrenchAdjustable} from "react-icons/bs";
import {Dialog as RadixDialog, Label, ScrollArea} from "radix-ui";
import {conversationService} from "../../api/conversationService.ts";
import {Attachment} from "./Attachment.tsx";
import {FaFileCirclePlus, FaRepeat, FaXmark} from "react-icons/fa6";
import MessageAttachmentInput from "./MessageAttachmentInput.tsx";
import type {AttachmentItem} from "./ChatInput.tsx";
import {useMessageOperationsStore} from "../../store/useMessageOperationsStore.ts";
import {useChatContainerContext} from "../../contexts/ChatContainerContext.tsx";
import {MessageEditorSuggestions} from "./MessageEditorSuggestions.tsx";

interface EditMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalMessage: TimelineMessageDto | undefined;
  handleSubmit: (newBody: string | null, removeAttachmentIds: string[], newAttachments: File[]) => void;
}

export default function EditMessageModal({
  open,
  onOpenChange,
  originalMessage,
  handleSubmit,
}: EditMessageModalProps) {
  const { conversationId } = useChatContainerContext();
  const setGalleryElements = useMediaGalleryStore((state) => state.setElements);

  const editOperation = useMessageOperationsStore(
    (state) => state.editOperationsByConversation[conversationId]?.[originalMessage?.id ?? ""]
  );

  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const textboxEditorRef = useRef<MessageTextboxEditorRef | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestionData | null>(null);
  const [cursorPosition, setCursorPosition] = useState(0);

  const [removeAttachmentIds, setRemoveAttachmentIds] = useState<string[]>(
    editOperation?.input.removeAttachmentIds ?? []
  );
  const [newAttachments, setNewAttachments] = useState<AttachmentItem[]>(() => {
    if (!editOperation?.input.addAttachments) return [];

    return editOperation.input.addAttachments.map(file => ({
      file,
      id: crypto.randomUUID(),
      previewUrl: URL.createObjectURL(file),
    }));
  });

  // sync state if edit operation changed for some reason.
  useEffect(() => {
    if (open) {
      setRemoveAttachmentIds(editOperation?.input.removeAttachmentIds ?? []);

      if (editOperation?.input.addAttachments) {
        setNewAttachments(
          editOperation.input.addAttachments.map(file => ({
            file,
            id: crypto.randomUUID(),
            previewUrl: URL.createObjectURL(file),
          }))
        );
      } else {
        setNewAttachments([]);
      }
    }
  }, [open, editOperation]);

  const initialBody = editOperation?.input.body !== undefined
    ? editOperation.input.body
    : originalMessage?.body ?? "";

  const handleAttachmentChanged = (e: ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || !files.length) {
      return;
    }

    const newAttachments = Array.from(files).map<AttachmentItem>(file => {
      const objectURL = URL.createObjectURL(file);

      return {
        file,
        id: crypto.randomUUID(),
        previewUrl: objectURL,
      };
    });

    setNewAttachments((prev: AttachmentItem[]): AttachmentItem[] => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const handleToggleRemoveCurrentAttachment = (attachmentId: string) => {
    setRemoveAttachmentIds((prev: string[]): string[] => {
      if (prev.includes(attachmentId)) {
        return prev.filter(v => v !== attachmentId);
      } else {
        return [...prev, attachmentId];
      }
    });
  };

  const handleRemoveNewAttachment = (attachmentId: string) => {
    setNewAttachments((prev: AttachmentItem[]): AttachmentItem[] => {
      const target = prev.find(v => v.id === attachmentId);
      if (target && target.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter(v => v.id !== attachmentId);
    });
  }

  const handleAttachmentClick = (index: number) => {
    const galleryElements: MediaGalleryElement[] = [];

    if (originalMessage && originalMessage.attachments && originalMessage.attachments.length > 0) {
      galleryElements.push(...originalMessage.attachments.map((a): MediaGalleryElement => ({
        id: a.id,
        fileName: a.name,
        mediaType: a.type,
        src: conversationService.getAttachmentViewUrl(a.id),
      })));
    }

    if (newAttachments.length > 0) {
      galleryElements.push(...newAttachments.map((a): MediaGalleryElement => ({
        id: a.id,
        fileName: a.file.name,
        mediaType: a.file.type,
        src: a.previewUrl,
      })));
    }

    setGalleryElements(galleryElements, index, {});
  };

  const handleEditSubmit = () => {
    if (!textboxEditorRef.current) return;

    handleSubmit(textboxEditorRef.current.convertToMarkdownString(), removeAttachmentIds, newAttachments.map(a => a.file));
    setRemoveAttachmentIds([]);
    setNewAttachments([]);
  };

  // object url revoking
  useEffect(() => {
    return () => {
      newAttachments.forEach(att => att.previewUrl && URL.revokeObjectURL(att.previewUrl));
    };
  }, [newAttachments]);

  useEffect(() => {
    if (!open) {
      newAttachments.forEach(att => att.previewUrl && URL.revokeObjectURL(att.previewUrl));
      setNewAttachments([]);
      setRemoveAttachmentIds([]);
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Message"
      subtitle="Should have gave it a thought first..."
      headerIcon={(<BsWrenchAdjustable className="size-10 fill-white"/>)}
      contentClassName="centered-dialog w-4xl rounded-xl text-white bg-gray-650 outline-none"
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

          <div className="relative">
            <MessageEditorSuggestions.Default
              suggestion={suggestion}
              textboxEditorRef={textboxEditorRef}
              cursorPosition={cursorPosition}
            />

            <MessageTextboxEditor
              ref={textboxEditorRef}
              key={open ? `${originalMessage.id}-${editOperation ? 'editing' : 'fresh'}` : undefined}
              initialValue={initialBody ?? ""}
              onSuggestionChange={(suggestion) => {
                setSuggestion(suggestion);
              }}
              onTextChange={(_text: string, cursorPosition: number) => {
                setCursorPosition(cursorPosition);
              }}
            />
          </div>

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
                        onClick={() => handleAttachmentClick(index)}
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

                {newAttachments.length > 0 && newAttachments.map((attachment, index) => (
                  <div key={index} className="relative shrink-0 h-13">
                    <Attachment.FilePill
                      key={index}
                      file={{
                        type: attachment.file.type,
                        src: attachment.previewUrl,
                        fileName: attachment.file.name,
                      }}
                      className="h-full border-2 rounded-md overflow-hidden pr-4 max-w-64 cursor-pointer border-green-500 bg-green-500/50"
                      onClick={() => handleAttachmentClick((originalMessage?.attachments?.length ?? 0) + index)}
                    />

                    <button
                      className={`
                        absolute border-2 rounded-full p-1 right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-pointer bg-gray-700 border-green-500
                      `}
                      onClick={() => handleRemoveNewAttachment(attachment.id)}
                    >
                      <FaXmark className="size-4 fill-white"/>
                    </button>
                  </div>
                ))}

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
                  onChange={handleAttachmentChanged}
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