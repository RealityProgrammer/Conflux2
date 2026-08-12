import {type ChangeEvent, type KeyboardEvent, useEffect, useRef} from "react";

export interface MessageEditorProps {
  initialValue: string;
  draftValue?: string | null;
  onDraftChange: (newDraft: string) => void;
  onSave: (newBody: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export default function MessageEditor({
                                        initialValue,
                                        draftValue,
                                        onDraftChange,
                                        onSave,
                                        onCancel,
                                        disabled
                                      }: MessageEditorProps) {
  const currentText = draftValue ?? initialValue;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(textarea.value.length, textarea.value.length);
      });
    }
  }, []);

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onDraftChange(newValue);

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const submitEdit = () => {
    const trimmedBody = currentText.trim();

    if (trimmedBody.length === 0) return;

    if (trimmedBody === initialValue) {
      onCancel();
      return;
    }

    onSave(trimmedBody);
  };

  return (
    <div className="flex flex-col w-full gap-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={currentText}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              maxLength={1024}
              className="block input-field min-h-10 max-h-40 w-full text-sm resize-none py-2 px-3 overflow-y-auto leading-6 whitespace-pre-wrap"
            />

      <span className="text-xs text-gray-400">
                Escape to <span className="text-blue-400 cursor-pointer hover:underline"
                                onClick={onCancel}>cancel</span>
        {" "}&#x2E31;{" "} {/*Explicit spacing*/}
        Enter to <span className="text-blue-400 cursor-pointer hover:underline" onClick={submitEdit}>save</span>
            </span>
    </div>
  );
}
