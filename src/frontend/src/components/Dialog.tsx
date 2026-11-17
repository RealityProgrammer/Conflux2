import type { ReactNode } from "react";
import { Dialog as RadixDialog } from "radix-ui";
import IconButton from "./IconButton.tsx";
import { FaXmark } from "react-icons/fa6";

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  contentClassName?: string;
  headerIcon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footerContent?: ReactNode;
  disableCloseOnOutsideClick?: boolean;
  disableCloseOnEscapeKeyDown?: boolean;
}

export default function Dialog({
  open,
  onOpenChange,
  trigger,
  contentClassName = "",
  headerIcon,
  title,
  subtitle,
  children,
  footerContent,
  disableCloseOnOutsideClick = false,
  disableCloseOnEscapeKeyDown = false,
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}

      <RadixDialog.Portal>
        <RadixDialog.Overlay className="backdrop-overlay" />

        <RadixDialog.Content
          className={`flex flex-col ${contentClassName}`}
          onPointerDownOutside={(e) => {
            if (disableCloseOnOutsideClick) {
              e.preventDefault();
            }
          }}
          onEscapeKeyDown={(e) => {
            if (disableCloseOnEscapeKeyDown) {
              e.preventDefault();
            }
          }}
        >
          <BodyContent
            headerIcon={headerIcon}
            title={title}
            subtitle={subtitle}
            footerContent={footerContent}
          >
            {children}
          </BodyContent>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

interface BodyContentProps {
  headerIcon?: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footerContent?: ReactNode;
}

function BodyContent({
  headerIcon,
  title,
  subtitle,
  children,
  footerContent,
}: BodyContentProps) {
  return (
    <>
      <header className="flex flex-none flex-row items-center gap-2 border-b-2 border-b-gray-600 bg-black/10 px-3 py-2">
        {headerIcon}

        <div className="flex-1">
          <RadixDialog.Title className="text-xl font-bold text-white">
            {title}
          </RadixDialog.Title>

          {subtitle && (
            <RadixDialog.Description className="text-sm text-gray-400">
              {subtitle}
            </RadixDialog.Description>
          )}
        </div>

        <RadixDialog.Close asChild>
          <IconButton theme="default" className="size-6">
            <FaXmark className="size-6" />
          </IconButton>
        </RadixDialog.Close>
      </header>

      <main className="min-h-0 min-w-0 flex-1">{children}</main>

      {footerContent && (
        <footer className="flex-none border-t-2 border-t-gray-600">
          {footerContent}
        </footer>
      )}
    </>
  );
}
