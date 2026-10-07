import Dialog from "../Dialog.tsx";
import {BsTrashFill} from "react-icons/bs";
import {Dialog as RadixDialog} from "radix-ui";

interface DeleteMessageConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function DeleteMessageConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
}: DeleteMessageConfirmationDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      headerIcon={<BsTrashFill className="size-10 fill-white"/>}
      title="Delete Message"
      subtitle="Nothing happened here, folk..."
      contentClassName="centered-dialog w-128 rounded-xl text-white bg-gray-650 outline-none"
      footerContent={(
        <div className="w-full flex flex-row justify-end p-3 gap-3">
          <RadixDialog.Close
            type="button"
            className="cursor-pointer basis-20 outline-none"
          >
            Cancel
          </RadixDialog.Close>

          <button
            className="button-theme-danger cursor-pointer px-3 py-2 rounded-md"
            onClick={onConfirm}
          >
            Delete message
          </button>
        </div>
      )}
    >
      <div className="p-3">
        Are you sure you want to delete this message?<br/>
        This action cannot be undone. You will never see this message and its attachments ever again.
      </div>
    </Dialog>
  )
}