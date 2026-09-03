import type {ReactNode} from "react";
import {Dialog as RadixDialog} from "radix-ui";
import IconButton from "./IconButton.tsx";
import {FaXmark} from "react-icons/fa6";

export interface DialogProps {
  open?: boolean;
  onOpenChanged?: (open: boolean) => void;
  trigger?: ReactNode;
  contentClassName?: string;
  headerIcon?: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
  footerContent?: ReactNode;
}

export default function Dialog({
  open,
  onOpenChanged,
  trigger,
  contentClassName,
  headerIcon,
  title,
  subtitle,
  children,
  footerContent,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChanged}>
      {trigger && (
        <RadixDialog.Trigger asChild>
          {trigger}
        </RadixDialog.Trigger>
      )}

      <RadixDialog.Portal>
        <RadixDialog.Overlay className="backdrop-overlay"/>

        <RadixDialog.Content className={`flex flex-col ${contentClassName}`}>
          <header className="flex-none bg-black/10 px-3 py-2 border-b-2 border-b-gray-600 flex flex-row items-center gap-2">
            {headerIcon}

            <div className="flex-1">
              <RadixDialog.Title className="font-bold text-xl text-white">{title}</RadixDialog.Title>
              <RadixDialog.Description className="text-sm text-gray-400">{subtitle}</RadixDialog.Description>
            </div>

            <RadixDialog.Close asChild>
              <IconButton theme="default" className="size-6">
                <FaXmark className="size-6"/>
              </IconButton>
            </RadixDialog.Close>
          </header>

          <main className="flex-1 overflow-hidden min-h-0 min-w-0 overflow-y-auto">
            {children}
          </main>

          {footerContent && (
            <footer className="flex-none border-t-2 border-t-gray-600">
              {footerContent}
            </footer>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}