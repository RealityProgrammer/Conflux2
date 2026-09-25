import {type HTMLAttributes} from "react";
import UserProfileContent from "./UserProfileContent.tsx";
import Spinner from "./Spinner.tsx";
import {BsExclamationTriangle} from "react-icons/bs";
import {useGetUserFullProfileQuery} from "../graphql/queries.ts";
import {userService} from "../api/userService.ts";
import {hash} from "../utils/hashing.ts";

export interface UserProfileCardProps extends HTMLAttributes<HTMLDivElement> {
  userId: string;
}

export default function UserProfilePanel({ userId, className, ...props }: UserProfileCardProps) {
  const { data, isLoading, isError } = useGetUserFullProfileQuery({ id: userId });

  return (
    <section className={`${className}`} {...props}>
      { isLoading ? (
        <div className="size-full flex flex-row justify-center items-center">
          <Spinner className="fill-white size-12"/>
        </div>
      ) : !isError && !!data && data.user ? (
        <UserProfileContent
          username={data.user.userName ?? "???"}
          displayName={data.user.displayName ?? "???"}
          avatarSrc={data.user.avatarRevision ? userService.getAvatarUrl(data.user.id, data.user.avatarRevision) : undefined}
          avatarAlt={`${data.user.displayName}'s avatar`}
          bannerSrc={data.user.bannerRevision ? userService.getBannerUrl(data.user.id, data.user.bannerRevision) : undefined}
          bannerAlt={`${data.user.displayName}'s banner`}
          bannerFallbackColor={`hsl(${Math.abs(hash(data.user.id)) % 360}, 60%, 40%)`}
          avatarClassName="border-gray-725"
          joinDate={new Date(data.user.createdAt)}
          friendedDate={new Date()}
          pronouns={data.user.pronouns ?? undefined}
          bio={data.user.biography ?? undefined}
          mutualFriendsCount={data.user.numMutualFriends}
          presenceStatus={data.user.effectivePresenceStatus}
          presenceStatusClassName="size-1/4 ring-4 ring-gray-725 bg-gray-725"
        />
      ) : (
        <div className="size-full flex flex-col justify-center items-center">
          <BsExclamationTriangle className="fill-white size-12"/>
          <span className="mt-2">Failed to load user profile</span>
        </div>
      )}
    </section>
  )
}