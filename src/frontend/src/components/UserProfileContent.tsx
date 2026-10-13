import {Separator} from "radix-ui";
import {FaBirthdayCake} from "react-icons/fa";
import {FaHandshake, FaMarsAndVenus} from "react-icons/fa6";
import type {PresenceStatus} from "../graphql/types.ts";
import {TruncatedText} from "./TruncatedText.tsx";
import {AvatarAndBanner} from "./AvatarAndBanner.tsx";
import type {CSSProperties} from "react";
import {UserProfile} from "./UserProfile.tsx";

interface UserProfileContentProps {
  userId: string;
  username: string;
  displayName: string;
  avatarVersion?: number;
  avatarAlt?: string;
  avatarClassName?: string;
  bannerVersion?: number;
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
  userId,
  username,
  displayName,
  avatarVersion,
  avatarAlt,
  avatarClassName,
  bannerVersion,
  bannerAlt,
  // presenceStatus,
  // presenceStatusClassName,
  bannerFallbackColor = "",
  joinDate,
  pronouns,
  bio,
  friendedDate,
  mutualFriendsCount
}: UserProfileContentProps) {
  return (
    <>
      <AvatarAndBanner.User
        userId={userId}
        avatarAlt={avatarAlt}
        avatarVersion={avatarVersion}
        bannerAlt={bannerAlt}
        bannerVersion={bannerVersion}
        bannerFallbackColor={bannerFallbackColor}
        // presenceStatus={presenceStatus}
        // presenceStatusClassName={presenceStatusClassName}
        avatarClassName={avatarClassName}
      />

      <div className="px-2">
        <UserProfile.Names
          displayName={displayName}
          userName={username}
        />

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