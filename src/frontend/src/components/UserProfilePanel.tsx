import {type HTMLAttributes} from "react";
import UserProfileContent from "./UserProfileContent.tsx";
import Spinner from "./Spinner.tsx";
import {BsExclamationTriangle} from "react-icons/bs";
import {useUserFullProfile} from "../hooks/fetchUserFullProfile.ts";

export interface UserProfileCardProps extends HTMLAttributes<HTMLDivElement> {
  userId: string;
}

export default function UserProfilePanel({ userId, className, ...props }: UserProfileCardProps) {
  const { data: userProfile, isLoading, isError } = useUserFullProfile(userId);

  return (
    <section className={`${className}`} {...props}>
      { isLoading ? (
        <div className="size-full flex flex-row justify-center items-center">
          <Spinner className="fill-white size-12"/>
        </div>
      ) : !isError && !!userProfile && userProfile.data ? (
        <UserProfileContent
          userId={userId}
          username={userProfile.data.userName}
          displayName={userProfile.data.displayName}
          hasAvatar={userProfile.data.hasAvatar}
          joinDate={userProfile.data.createdAt}
          friendedDate={new Date()}
          pronouns={userProfile.data.pronouns ?? undefined}
          bio={userProfile.data.biography ?? undefined}
          mutualFriendsCount={userProfile.data.numMutualFriends}
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