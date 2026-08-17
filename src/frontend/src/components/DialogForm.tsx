import {Dialog} from "radix-ui";
import type {ReactNode} from "react";

export interface DialogFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  action: (formData: FormData) => void;
  body: () => ReactNode;
  submitButton: () => ReactNode;
  contentClassName?: string;
  headerIcon?: ReactNode;
  onClear?: () => void;
}

export default function DialogForm({
  open,
  onOpenChange,
  title,
  description,
  action,
  body,
  submitButton,
  contentClassName,
  headerIcon,
  onClear,
}: DialogFormProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="backdrop-overlay"/>

        <Dialog.Content className={`bg-gray-650 ${contentClassName ?? ""}`}>
          <header className="bg-black/10 px-3 py-2 border-b-2 border-b-gray-600 flex flex-row items-center gap-2">
            {headerIcon}

            <div className="flex-1">
              <Dialog.Title className="font-bold text-xl text-white">{title}</Dialog.Title>

              {description && (
                <Dialog.Description className="text-sm text-gray-400">Give it a name, a vessel. Give it a life...</Dialog.Description>
              )}
            </div>
          </header>

          <form className="flex flex-col items-center mt-2 p-2" action={action}>
            {body()}

            <footer className="w-full flex flex-row justify-end mt-2 gap-3">
              {onClear && (
                <button type="button" className="flex-none button-theme-danger cursor-pointer rounded-md px-6 mr-auto" onClick={onClear}>
                  Clear
                </button>
              )}

              <Dialog.Close
                type="button"
                className="cursor-pointer basis-20"
              >
                Cancel
              </Dialog.Close>

              {submitButton()}
            </footer>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}