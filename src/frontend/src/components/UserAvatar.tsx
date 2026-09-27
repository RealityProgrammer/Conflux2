import {Avatar} from "radix-ui";
import {BsPerson} from "react-icons/bs";
import type {HTMLAttributes, RefObject} from "react";

interface UserAvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  ref?: RefObject<HTMLDivElement | null>;
}

export default function UserAvatar({
  src,
  alt,
  className = "",
  ref,
  ...props
}: UserAvatarProps) {
  return (
    <div ref={ref} className={`aspect-square rounded-full ${className}`} {...props}>
      <Avatar.Root className="block size-full overflow-hidden rounded-[inherit]">
        <Avatar.Image
          className="size-full object-cover"
          src={src}
          alt={alt}
        />

        <Avatar.Fallback className="flex size-full items-center justify-center bg-gray-100">
          <BsPerson className="size-5/6 fill-black" />
        </Avatar.Fallback>
      </Avatar.Root>
    </div>
  );
}