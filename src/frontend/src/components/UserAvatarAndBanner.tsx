import {Avatar} from "radix-ui";
import type {PresenceStatus} from "../graphql/types.ts";
import {BsPerson} from "react-icons/bs";

interface AvatarAndBannerProps {
  avatarSrc?: string;
  avatarAlt?: string;
  bannerSrc?: string;
  bannerAlt?: string;
  avatarClassName?: string;
  presenceStatus?: PresenceStatus;
}

export default function UserAvatarAndBanner({
  avatarSrc,
  avatarAlt,
  bannerSrc,
  bannerAlt,
  avatarClassName = "",
}: AvatarAndBannerProps) {
  return (
    <div className="relative w-full aspect-video mb-11">
      <Avatar.Root className="block w-full aspect-video overflow-hidden">
        <Avatar.Image className="size-full object-cover" src={bannerSrc} alt={bannerAlt}/>

        <Avatar.Fallback className="flex size-full aspect-video bg-indigo-500"></Avatar.Fallback>
      </Avatar.Root>

      <Avatar.Root className={`absolute left-2 bottom-0 translate-y-1/2 size-21 rounded-full overflow-hidden border-4 ${avatarClassName}`}>
        <Avatar.Image className="size-full object-cover" src={avatarSrc} alt={avatarAlt}/>

        <Avatar.Fallback className="flex justify-center items-center size-full aspect-video bg-stone-200">
          <BsPerson className="size-5/6 fill-black" />
        </Avatar.Fallback>
      </Avatar.Root>
    </div>
  )
}