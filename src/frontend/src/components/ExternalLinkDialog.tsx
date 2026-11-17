import { useEffect, useState } from "react";
import Dialog from "./Dialog.tsx";
import { BsBoxArrowUpRight } from "react-icons/bs";
import { Dialog as RadixDialog } from "radix-ui";
import { useExternalLinkDialog } from "../store/useExternalLinkDialog.ts";

const CONFIRMATION_DELAY = 5000;

export default function ExternalLinkDialog() {
  const { isOpen, url, closeDialog } = useExternalLinkDialog();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog();
    }
  };

  const handleConfirm = () => {
    if (url) {
      // Open the URL in a new tab securely
      window.open(url, "_blank", "noopener,noreferrer");
    }
    closeDialog();
  };

  const [canConfirm, setCanConfirm] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // reset states when the dialog opens
      setCanConfirm(false);
      setProgress(0);

      // start the visual CSS transition (added a bit delay at the start)
      const startAnimTimer = setTimeout(() => {
        setProgress(100);
      }, 50);

      // unlock button
      const enableTimer = setTimeout(() => {
        setCanConfirm(true);
      }, CONFIRMATION_DELAY + 50);

      return () => {
        clearTimeout(startAnimTimer);
        clearTimeout(enableTimer);
      };
    } else {
      setProgress(0);
      setCanConfirm(false);
    }
  }, [isOpen]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="Prepare to be in the barren land"
      subtitle="It is dangerous out there..."
      contentClassName="centered-dialog text-white bg-gray-650 outline-none container"
      headerIcon={<BsBoxArrowUpRight className="size-10 fill-white" />}
      footerContent={
        <div className="flex w-full flex-row justify-end gap-3 p-3">
          <RadixDialog.Close
            type="button"
            className="basis-20 cursor-pointer outline-none"
          >
            Cancel
          </RadixDialog.Close>

          <button
            disabled={!canConfirm}
            className={`relative w-40 overflow-hidden rounded-md py-2 outline-none ${canConfirm ? "cursor-pointer" : "cursor-not-allowed"}`}
            onClick={handleConfirm}
          >
            <div className="absolute inset-0 bg-red-600" />
            <div
              className="absolute top-0 bottom-0 left-0 bg-green-600 ease-linear"
              style={{
                width: `${progress}%`,
                transitionProperty: "width",
                transitionDuration:
                  progress === 100 ? `${CONFIRMATION_DELAY}ms` : "0ms",
              }}
            />

            <span className="relative z-10 flex items-center justify-center font-medium text-white select-none">
              {canConfirm ? "Confirm Redirect" : "Wait..."}
            </span>
          </button>
        </div>
      }
    >
      <div className="space-y-3 p-3">
        <p>
          Are you sure you want to access this external URL?
          <br />
          Look closely, it can be a trap...
          <br />
        </p>

        <span className="mt-3">
          External URL:
          <pre className="mt-1 rounded-md border-2 border-gray-500 bg-black/8 p-2 text-sm text-wrap">
            {url}
          </pre>
        </span>
      </div>
    </Dialog>
  );
}
