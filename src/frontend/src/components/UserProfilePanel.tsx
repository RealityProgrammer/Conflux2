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
      ) : !isError && !!data && data.userById ? (
        <UserProfileContent
          userId={userId}
          username={data.userById.userName ?? "???"}
          displayName={data.userById.displayName ?? "???"}
          hasAvatar={data.userById.hasAvatar}
          joinDate={new Date(data.userById.createdAt)}
          friendedDate={new Date()}
          pronouns={data.userById.pronouns ?? undefined}
          bio={data.userById.biography ?? undefined}
          mutualFriendsCount={data.userById.numMutualFriends}
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