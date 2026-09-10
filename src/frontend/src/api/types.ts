import {type components} from "./schema.ts";
import type {GetUserFullProfileQuery, GetUserIdentityProfileQuery} from "../graphql/queries.ts";
import type {HttpStatusCode} from "axios";

// requests
export type LoginRequest = components["schemas"]["LoginRequest"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];
export type EmailConfirmationRequest = components["schemas"]["ConfirmEmailRequest"];

export class SetAvatar {
  readonly type = "set";

  constructor(public file: File, public previewUrl: string) {
  }
}

export class DeleteAvatar {
  readonly type = "delete";
}

export class NoAvatarModification {
  readonly type = "noMod";
}

export type AvatarOperation = SetAvatar | DeleteAvatar | NoAvatarModification;

export const INVITATION_EXPIRE_VALUES = [
  "FiveMinutes", "FifteenMinutes", "ThirtyMinutes", "OneHour", "TwoHours",
  "ThreeHours", "SixHours", "TwelveHours", "OneDay", "OneWeek",
  "TwoWeeks", "FourWeeks", "Infinite"
] as const;

export type InvitationExpireAfter = components["schemas"]["InvitationExpireAfter"];

// responses
export type FieldErrors<F extends keyof any> = Record<F, string[]>;
export type ServiceError = components["schemas"]["Error"];

export type BackendResponse<T = void> =
  Omit<components["schemas"]["ApiResponseOfLoginResponse"], "data"> & (T extends void ? {} : { data?: T | null });

export type ServiceResponse<T = void> = {
  success: boolean;
  statusCode: HttpStatusCode;
  error?: ServiceError | null;
} & (T extends void ? {} : { data?: T | null });

export type PaginatedResult<T> =
  Omit<components["schemas"]["PaginatedResultOfDiscoverFriendSummary"], "elements"> & { elements: T[] };

export type UserAuthorizationInfo = components["schemas"]["UserAuthorizationInfo"];

export type UserIdentityProfileDto = NonNullable<GetUserIdentityProfileQuery['user']>;
export type UserFullProfileDto = NonNullable<GetUserFullProfileQuery['user']>

export type LoginResponse = components["schemas"]["LoginResponse"];
export type RefreshResponse = components["schemas"]["RefreshResponse"];

export type DiscoverFriendSummary = components["schemas"]["DiscoverFriendSummary"];
export type PendingFriendRequestDto = components["schemas"]["PendingFriendRequestDto"];
export type DirectMessageResolutionResponse = components["schemas"]["DirectMessageResolutionResponse"];
export type DmChannelSummary = components["schemas"]["DmChannelSummary"];
export type Attachment = components["schemas"]["Attachment"];
export type TimelineMessageClusterDto = components["schemas"]["TimelineMessageClusterDto"];
export type TimelineMessageClusterItemDto = components["schemas"]["TimelineMessageClusterItemDto"];
export type TimelineMessageReplyDto = components["schemas"]["TimelineMessageReplyDto"];
export type TimelineMessageDto = components["schemas"]["TimelineMessageDto"];
export type GetMessagesResponse = components["schemas"]["GetMessagesResponse"];
export type DmConversationListItemDto = components["schemas"]["DmConversationListItemDto"];
export type ServerChannelIdentityDto = components["schemas"]["ServerChannelIdentityDto"];
export type ChannelCategoryDetailDto = components["schemas"]["ChannelCategoryDetailDto"];
export type ChannelCategoryIdentityDto = components["schemas"]["ChannelCategoryIdentityDto"];
export type ServerDetailDto = components["schemas"]["ServerDetailDto"];
export type ServerRoleDto = components["schemas"]["ServerRoleDto"];
export type ServerMemberAuthorizationInfoDto = components["schemas"]["ServerMemberAuthorizationInfoDto"];
export type ServerIdentityDto = components["schemas"]["ServerIdentityDto"];
