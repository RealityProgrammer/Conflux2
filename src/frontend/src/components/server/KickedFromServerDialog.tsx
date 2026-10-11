import Dialog from "../Dialog.tsx";
import {BsHammer} from "react-icons/bs";
import {useNavigate} from "react-router";

interface KickedFromServerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function KickedFromServerDialog({
  open,
  onOpenChange,
}: KickedFromServerDialogProps) {
  const navigate = useNavigate();
  
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          navigate("/lobby/me", {
            replace: true,
          });
        }

        onOpenChange(open);
      }}
      headerIcon={(
        <BsHammer className="size-10 fill-white"/>
      )}
      title="Kicked from server"
      subtitle="You have been banished by the council"
      contentClassName="centered-dialog rounded-xl text-white bg-gray-650 outline-none w-lg"
      disableCloseOnOutsideClick
      disableCloseOnEscapeKeyDown
    >
      <div className="px-4 py-3">
        You've been kicked from the server.<br/>

        But don't worry, you can rejoin if you have an active invitation.
      </div>
    </Dialog>
  );
}