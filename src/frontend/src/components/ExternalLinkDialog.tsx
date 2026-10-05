import {useEffect, useState} from "react";
import Dialog from "./Dialog.tsx";
import {BsBoxArrowUpRight} from "react-icons/bs";
import {Dialog as RadixDialog} from "radix-ui";
import {useExternalLinkDialog} from "../store/useExternalLinkDialog.tsx";

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
      window.open(url, '_blank', 'noopener,noreferrer');
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
      contentClassName="centered-dialog w-160 rounded-xl text-white bg-gray-650 outline-none"
      headerIcon={(
        <BsBoxArrowUpRight className="fill-white size-10"/>
      )}
      footerContent={(
        <div className="w-full flex flex-row justify-end p-3 gap-3">
          <RadixDialog.Close
            type="button"
            className="cursor-pointer basis-20 outline-none"
          >
            Cancel
          </RadixDialog.Close>

          <button
            disabled={!canConfirm}
            className={`relative overflow-hidden outline-none w-40 py-2 rounded-md ${canConfirm ? "cursor-pointer" : "cursor-not-allowed"}`}
            onClick={handleConfirm}
          >
            <div className="absolute inset-0 bg-red-600" />
            <div
              className="absolute left-0 top-0 bottom-0 bg-green-600 ease-linear"
              style={{
                width: `${progress}%`,
                transitionProperty: "width",
                transitionDuration: progress === 100 ? `${CONFIRMATION_DELAY}ms` : "0ms",
              }}
            />

            <span className="relative z-10 text-white font-medium select-none flex items-center justify-center">
              {canConfirm ? "Confirm Redirect" : "Wait..."}
            </span>
          </button>
        </div>
      )}
    >
      <div className="p-3 space-y-3">
        <p>
          Are you sure you want to access this external URL?<br/>
          Look closely, it can be a trap...<br/>
        </p>

        <span className="mt-3">
          External URL:

          <pre className="mt-1 p-2 bg-black/8 border-2 border-gray-500 rounded-md text-wrap text-sm">
            {url}
          </pre>
        </span>
      </div>
    </Dialog>
  )
}