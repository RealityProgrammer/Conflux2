import {Separator} from "radix-ui";
import {FaBirthdayCake} from "react-icons/fa";
import {FaHandshake, FaMarsAndVenus} from "react-icons/fa6";
import UserAvatarAndBanner from "./UserAvatarAndBanner.tsx";
import {hash} from "../utils/hashing.ts";
import type {CSSProperties} from "react";
import type {PresenceStatus} from "../graphql/types.ts";
import {TruncatedText} from "./TruncatedText.tsx";

interface UserProfileContentProps {
  username: string;
  displayName: string;
  avatarSrc?: string;
  avatarAlt?: string;
  avatarClassName?: string;
  bannerSrc?: string;
  bannerAlt?: string;
  bannerFallbackColor?: CSSProperties["backgroundColor"];
  presenceStatus?: PresenceStatus;
  presenceStatusClassName?: string;
  joinDate?: Date;
  pronouns?: string;
  bio?: string;
  friendedDate?: Date;
  mutualFriendsCount?: number;
}

export default function UserProfileContent({
  username,
  displayName,
  avatarSrc,
  avatarAlt,
  avatarClassName,
  bannerSrc,
  bannerAlt,
  bannerFallbackColor,
  presenceStatus,
  presenceStatusClassName,
  joinDate,
  pronouns,
  bio,
  friendedDate,
  mutualFriendsCount
}: UserProfileContentProps) {
  return (
    <>
      <UserAvatarAndBanner
        avatarSrc={avatarSrc}
        avatarAlt={avatarAlt}
        bannerSrc={bannerSrc}
        bannerAlt={bannerAlt}
        bannerFallbackColor={bannerFallbackColor}
        presenceStatus={presenceStatus}
        presenceStatusClassName={presenceStatusClassName}
        avatarClassName={avatarClassName}
      />

      <div className="px-2">
        <p className="text-xl font-bold truncate">{displayName}</p>
        <p className="text-sm ml-1 truncate text-stone-300">@{username}</p>

        <div className="grid grid-cols-2 gap-x-2 text-sm mt-2 text-gray-500">
          <p className="mt-1 min-w-0 flex items-center gap-2">
            <FaBirthdayCake className="flex-none size-4 fill-gray-50"/>

            {joinDate ? new Date(joinDate).toLocaleDateString() : "-"}
          </p>

          {friendedDate && (
            <p className="mt-1 min-w-0 flex items-center gap-2">
              <FaHandshake className="flex-none size-4 fill-gray-50 mr-2"/>

              {new Date(friendedDate).toLocaleDateString()}
            </p>
          )}

          {pronouns && (
            <p className="mt-1 min-w-0 flex items-center gap-2">
              <FaMarsAndVenus className="flex-none size-4 fill-gray-50 mr-2"/>

              <TruncatedText>{pronouns}</TruncatedText>
            </p>
          )}
        </div>

        {bio && (
          <>
            <Separator.Root orientation="horizontal" decorative className="horizontal-separator my-2"/>

            <p className="group-label">About me</p>

            <p className="text-[13px] text-gray-50">{bio}</p>
          </>
        )}

        {mutualFriendsCount && (
          <>
            <Separator.Root orientation="horizontal" decorative className="horizontal-separator my-2"/>
            <span className="text-xs block">{mutualFriendsCount} mutual friends.</span>
          </>
        )}
      </div>
    </>
  );
}