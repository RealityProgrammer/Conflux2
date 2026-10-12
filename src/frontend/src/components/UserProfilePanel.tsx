import {type HTMLAttributes} from "react";
import UserProfileContent from "./UserProfileContent.tsx";
import Spinner from "./Spinner.tsx";
import {BsExclamationTriangle} from "react-icons/bs";
import {useGetUserFullProfileQuery} from "../graphql/queries.ts";
import {hash} from "../utils/hashing.ts";
import {AvatarAndBanner} from "./AvatarAndBanner.tsx";
import {UserProfile} from "./UserProfile.tsx";
import {Separator} from "radix-ui";

export interface UserProfileCardProps extends HTMLAttributes<HTMLDivElement> {
  userId: string;
  avatarClassName?: string;
}

export default function UserProfilePanel({
  userId,
  avatarClassName = "",
  className,
  ...props
}: UserProfileCardProps) {
  const { data, isLoading, isError } = useGetUserFullProfileQuery({ id: userId });

  return (
    <section className={`${className}`} {...props}>
      { isLoading ? (
        <div className="size-full flex flex-row justify-center items-center">
          <Spinner className="fill-white size-12"/>
        </div>
      ) : !isError && !!data && data.user ? (
        <>
          <AvatarAndBanner.User
            userId={userId}
            avatarAlt={`Avatar of ${data.user.displayName ?? "???"}`}
            avatarVersion={data.user.avatar?.version}
            bannerAlt={`Banner of ${data.user.displayName ?? "???"}`}
            bannerVersion={data.user.banner?.version}
            bannerFallbackColor={`hsl(${Math.abs(hash(data.user.id)) % 360}, 60%, 40%)`}
            // presenceStatus={presenceStatus}
            // presenceStatusClassName={presenceStatusClassName}
            avatarClassName={avatarClassName}
          />
          
          <div className="px-2">
            <UserProfile.Names displayName={data.user.displayName ?? "???"} userName={data.user.userName ?? "???"}/>
            
            <UserProfile.FieldContainer>
              <UserProfile.Field label="Field 1" value="Value 1"/>
              <UserProfile.Field label="Field 2" value="Value 2"/>
              <UserProfile.Field label="Field 3" value="Value 3"/>
              <UserProfile.Field label="Field 4" value="Value 4"/>
            </UserProfile.FieldContainer>

            <Separator.Root orientation="horizontal" decorative className="horizontal-separator my-2"/>

            <span className="group-label">About me</span>

            <p className="text-[13px] text-gray-50">Insert bio here</p>
          </div>
        </>
        // <UserProfileContent
        //   userId={data.user.id}
        //   username={data.user.userName ?? "???"}
        //   displayName={data.user.displayName ?? "???"}
        //   avatarVersion={data.user.avatar?.version}
        //   avatarAlt={`${data.user.displayName}'s avatar`}
        //   bannerVersion={data.user.banner?.version}
        //   bannerAlt={`${data.user.displayName}'s banner`}
        //   bannerFallbackColor={`hsl(${Math.abs(hash(data.user.id)) % 360}, 60%, 40%)`}
        //   avatarClassName={avatarClassName}
        //   joinDate={new Date(data.user.createdAt)}
        //   friendedDate={new Date()}
        //   pronouns={data.user.pronouns ?? undefined}
        //   bio={data.user.biography ?? undefined}
        //   mutualFriendsCount={data.user.numMutualFriends}
        //   presenceStatus={data.user.effectivePresenceStatus}
        //   presenceStatusClassName="size-1/4 ring-4 ring-gray-725 bg-gray-725"
        // />
      ) : (
        <div className="size-full flex flex-col justify-center items-center">
          <BsExclamationTriangle className="fill-white size-12"/>
          <span className="mt-2">Failed to load user profile</span>
        </div>
      )}
    </section>
  )
}