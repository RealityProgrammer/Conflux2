import {type components} from "./schema.ts";
import type {GetUserIdentityProfileQuery} from "../graphql/queries.ts";
import type {HttpStatusCode} from "axios";

// requests
export type LoginRequest = components["schemas"]["LoginRequest"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];

export type InvitationExpireAfter = components["schemas"]["InvitationExpireAfter"];

// responses
export type ServiceError = components["schemas"]["Error"];
export type BackendResult<T = void> = {
  isSuccess: boolean;
  error: ServiceError;
} & (T extends void ? {} : { value?: T | null })

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

export type LoginResponse = components["schemas"]["LoginResponse"];
export type RefreshResponse = components["schemas"]["RefreshResponse"];

export type DiscoverFriendSummary = components["schemas"]["DiscoverFriendSummary"];
export type DirectConversationSummary = components["schemas"]["DirectConversationSummary"];
export type MediaItemDto = components["schemas"]["MediaItemDto"];
export type StartCallResult = components["schemas"]["StartCallResult"];
export type TimelineMessageSenderDto = components["schemas"]["TimelineMessageSenderDto"];
export type TimelineMessageDto = components["schemas"]["TimelineMessageDto"];
export type MessageAttachmentDto = components["schemas"]["MessageAttachmentDto"];
export type TimelineMessagePage = components["schemas"]["TimelineMessagePage"];
export type ServerChannelIdentityDto = components["schemas"]["ServerChannelIdentityDto"];
export type ChannelCategoryDetailDto = components["schemas"]["ChannelCategoryDetailDto"];
export type ChannelCategoryIdentityDto = components["schemas"]["ChannelCategoryIdentityDto"];
export type ServerDetailsDto = components["schemas"]["ServerDetailsDto"];
export type ServerMemberAuthorizeInfoDto = components["schemas"]["ServerMemberAuthorizeInfoDto"];
export type ChannelDetailsDto = components["schemas"]["ChannelDetailsDto"];
export type ServerRoleDto = components["schemas"]["ServerRoleDto"];
export type ServerIdentityDto = components["schemas"]["ServerIdentityDto"];
export type CallEndProperties = Omit<components["schemas"]["MessagePropertiesCallEndProperties"], "$type">;
export type GetIncomingDirectCallQueryResult = components["schemas"]["GetIncomingDirectCallQueryResult"];
export type MessageReadStrategy = components["schemas"]["MessageReadStrategy"];
export type UpdateProfileResult = components["schemas"]["UpdateProfileResult"];
export type AccountDeletionStatusDto = components["schemas"]["AccountDeletionStatusDto"];
export type RestoreAccountResponse = components["schemas"]["RestoreAccountResponse"];
export type SessionsQueryResult = components["schemas"]["SessionsQueryResult"];
export type SessionDetails = components["schemas"]["SessionDetails"];
export type SessionDevice = components["schemas"]["SessionDevice"];
export type EmojiManagementDto = components["schemas"]["EmojiManagementDto"];
export type EmojiDto = components["schemas"]["EmojiDto"];
export type ServerEmojiGroupDto = components["schemas"]["ServerEmojiGroupDto"];

export type EditedMessageDto = {
  id: string;
  newBody: string | null;
}