import {AlertDialog} from "radix-ui";
import type {ReactNode} from "react";

export interface AlertActionDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string | (() => ReactNode);
  panelClassName?: string;
  actionButton: ReactNode;
}

export default function AlertActionDialog({
  open,
  onOpenChange,
  title,
  description,
  panelClassName,
  actionButton
}: AlertActionDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="backdrop-overlay"/>

        <AlertDialog.Content
          className={`dialog-panel rounded-md bg-gray-650 p-6 text-white ${panelClassName ?? ''}`}>
          <AlertDialog.Title className="font-semibold text-lg mb-1">{title}</AlertDialog.Title>

          {description && (
            <AlertDialog.Description className="mb-6">
              { typeof description === "function" ? description() : description }
            </AlertDialog.Description>
          )}

          <div className="flex justify-end gap-8">
            <AlertDialog.Cancel asChild>
              <button className="cursor-pointer outline-none">
                Cancel
              </button>
            </AlertDialog.Cancel>

            <AlertDialog.Action asChild>
              {actionButton}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}