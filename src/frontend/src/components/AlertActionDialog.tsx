import {AlertDialog as RadixAlertDialog, Dialog as RadixDialog} from "radix-ui";
import type {ReactNode} from "react";
import IconButton from "./IconButton.tsx";
import {FaXmark} from "react-icons/fa6";

export interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  contentClassName?: string;
  headerIcon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  cancelButton: ReactNode;
  actionButton: ReactNode;
  disableCloseOnEscapeKeyDown?: boolean;
}

export default function AlertDialog({
  open,
  onOpenChange,
  trigger,
  contentClassName,
  headerIcon,
  title,
  subtitle,
  children,
  cancelButton,
  actionButton,
  disableCloseOnEscapeKeyDown = false,
}: AlertDialogProps) {
  return (
    <RadixAlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && (
        <RadixDialog.Trigger asChild>
          {trigger}
        </RadixDialog.Trigger>
      )}
      
      <RadixAlertDialog.Portal>
        <RadixAlertDialog.Overlay className="backdrop-overlay"/>

        <RadixAlertDialog.Content
          className={`flex flex-col ${contentClassName ?? ""}`}
          onEscapeKeyDown={(e) => {
            if (disableCloseOnEscapeKeyDown) {
              e.preventDefault();
            }
          }}
        >
          <header className="flex-none bg-black/10 px-3 py-2 border-b-2 border-b-gray-600 flex flex-row items-center gap-2">
            {headerIcon}

            <div className="flex-1">
              <RadixAlertDialog.Title className="font-bold text-xl text-white">{title}</RadixAlertDialog.Title>

              {subtitle && (
                <RadixAlertDialog.Description className="text-sm text-gray-400">{subtitle}</RadixAlertDialog.Description>
              )}
            </div>

            <RadixAlertDialog.Cancel asChild>
              <IconButton theme="default" className="size-6">
                <FaXmark className="size-6"/>
              </IconButton>
            </RadixAlertDialog.Cancel>
          </header>

          <main className="flex-1 overflow-hidden min-h-0 min-w-0 overflow-y-auto">
            {children}
          </main>

          <footer className="flex-none border-t-2 border-t-gray-600">
            <div className="w-full flex flex-row justify-end p-3 gap-3">
              <RadixAlertDialog.Cancel asChild>
                {cancelButton}
              </RadixAlertDialog.Cancel>
              
              <RadixAlertDialog.Action asChild>
                {actionButton}
              </RadixAlertDialog.Action>
            </div>
          </footer>
        </RadixAlertDialog.Content>
      </RadixAlertDialog.Portal>
    </RadixAlertDialog.Root>
  );
}