import UserAvatar from "./UserAvatar.tsx";
import {Separator} from "radix-ui";
import {FaBirthdayCake} from "react-icons/fa";
import {FaHandshake, FaMarsAndVenus} from "react-icons/fa6";

interface UserProfileContentProps {
  userId: string;
  username: string;
  displayName: string;
  hasAvatar?: boolean;
  bannerUrl?: string;
  joinDate?: Date;
  friendedDate?: Date;
  pronouns?: string;
  bio?: string;
  mutualFriendsCount: number;
}

export default function UserProfileContent({
  userId,
  username,
  displayName,
  hasAvatar,
  bannerUrl,
  joinDate,
  pronouns,
  bio,
  friendedDate,
  mutualFriendsCount
}: UserProfileContentProps) {
  return (
    <>
      <div className="relative aspect-video w-full">
        {bannerUrl ? (
          <img
            src={bannerUrl}
            alt={`${displayName}'s banner`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="size-full bg-indigo-500"/>
        )}

        <UserAvatar
          userId={userId}
          hasAvatar={!!hasAvatar}
          className="absolute -bottom-10 left-4 size-21 rounded-full overflow-hidden"
        />
      </div>

      <div className="mt-12 px-2">
        <span className="text-xl font-bold leading-none text-gray-50">
          {displayName}
        </span>

        <span className="ml-2 text-sm font-medium leading-none text-gray-400">
          @{username}
        </span>

        <div className="grid grid-cols-2 gap-x-2 text-[13px]">
          {joinDate && (
            <span className="mt-1 inline-flex items-center text-sm text-gray-50">
              <FaBirthdayCake className="size-4 fill-gray-50 mr-2"/>
              {joinDate?.toLocaleDateString() || ""}
            </span>
          )}

          {friendedDate && (
            <span className="mt-1 inline-flex items-center text-sm text-gray-50">
              <FaHandshake className="size-4 fill-gray-50 mr-2"/>
              {friendedDate?.toLocaleDateString() || ""}
            </span>
          )}

          {pronouns && (
            <span className="mt-1 inline-flex items-center text-sm text-gray-50">
              <FaMarsAndVenus className="size-4 fill-gray-50 mr-2"/>
              {pronouns || ""}
            </span>
          )}
        </div>

        <Separator.Root orientation="horizontal" decorative className="h-px bg-gray-600 my-2 flex-none"/>

        {bio && (
          <>
            <p className="text-[13px] text-gray-50">{bio}</p>
            <Separator.Root orientation="horizontal" decorative className="h-px bg-gray-600 my-2 flex-none"/>
          </>
        )}

        <span className="text-xs block">{mutualFriendsCount} mutual friends.</span>
        <span className="text-xs block">N mutual server.</span>
      </div>
    </>
  );
}