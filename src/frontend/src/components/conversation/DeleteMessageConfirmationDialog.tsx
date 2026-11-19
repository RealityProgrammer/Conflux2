import Dialog from "../Dialog.tsx";
import { BsTrashFill } from "react-icons/bs";
import { Dialog as RadixDialog } from "radix-ui";

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
      headerIcon={<BsTrashFill className="size-10 fill-white" />}
      title="Delete Message"
      subtitle="Nothing happened here, folk..."
      contentClassName="centered-dialog w-xl text-white bg-gray-650 outline-none"
      footerContent={
        <div className="flex flex-row justify-end gap-3 p-3">
          <RadixDialog.Close type="button" className="basis-20 cursor-pointer outline-none">
            Cancel
          </RadixDialog.Close>

          <button className="button-theme-danger cursor-pointer rounded-md px-3 py-2" onClick={onConfirm}>
            Delete message
          </button>
        </div>
      }
    >
      <div className="panel-padding">
        Are you sure you want to delete this message?
        <br />
        This action cannot be undone. You will never see this message and its attachments ever again.
      </div>
    </Dialog>
  );
}
