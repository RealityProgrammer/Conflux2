import {type HTMLAttributes} from "react";
import UserProfileContent from "./UserProfileContent.tsx";
import Spinner from "./Spinner.tsx";
import {BsExclamationTriangle} from "react-icons/bs";
import {useGetUserFullProfileQuery} from "../graphql/queries.ts";

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
          userId={userId}
          username={data.user.userName ?? "???"}
          displayName={data.user.displayName ?? "???"}
          hasAvatar={data.user.hasAvatar}
          joinDate={new Date(data.user.createdAt)}
          friendedDate={new Date()}
          pronouns={data.user.pronouns ?? undefined}
          bio={data.user.biography ?? undefined}
          mutualFriendsCount={data.user.numMutualFriends}
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