import {BsPeople} from "react-icons/bs";
import {Avatar} from "radix-ui";

export default function AvatarFallback() {
  return (
    <Avatar.Fallback
      className="flex size-full items-center justify-center bg-slate-300"
    >
      <BsPeople className="fill-black size-5/6"/>
    </Avatar.Fallback>
  );
}