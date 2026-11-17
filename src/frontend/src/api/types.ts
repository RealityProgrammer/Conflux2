import { type components } from "./schema.ts";
import type { GetUserIdentityProfileQuery } from "../graphql/queries.ts";
import type { HttpStatusCode } from "axios";

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

export type UserAuthorizationInfo = components["schemas"]["UserAuthorizationInfo"];

export type UserIdentityProfileDto = NonNullable<GetUserIdentityProfileQuery['user']>;

export type KeyedPaginatedPage<TKey, TElement> =
  Omit<components["schemas"]["KeyedPaginatedPageOfDateTimeOffsetAndPinnedMessageDto"], "beforeKey" | "afterKey" | "elements"> &
  { beforeKey: TKey, afterKey: TKey, elements: TElement[] };

export type LoginResponse = components["schemas"]["LoginResponse"];
export type RefreshResponse = components["schemas"]["RefreshResponse"];
export type PinnedMessageDto = components["schemas"]["PinnedMessageDto"];

export type StartCallResult = components["schemas"]["StartCallResult"];
export type TimelineMessageSenderDto = components["schemas"]["TimelineMessageSenderDto"];
export type TimelineMessageDto = components["schemas"]["TimelineMessageDto"];
export type EditedMessageDto = components["schemas"]["EditedMessageDto"];
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
export type UpdateProfileResult = components["schemas"]["UpdateProfileResult"];
export type AccountDeletionStatusDto = components["schemas"]["AccountDeletionStatusDto"];
export type RestoreAccountResponse = components["schemas"]["RestoreAccountResponse"];
export type SessionsQueryResult = components["schemas"]["SessionsQueryResult"];
export type SessionDetails = components["schemas"]["SessionDetails"];
export type SessionDevice = components["schemas"]["SessionDevice"];
export type EmojiManagementDto = components["schemas"]["EmojiManagementDto"];
export type EmojiDto = components["schemas"]["EmojiDto"];
export type ServerEmojiGroupDto = components["schemas"]["ServerEmojiGroupDto"];
export type UnreadNotificationCounts = components["schemas"]["UnreadNotificationCounts"];
export type FriendSearchResponse = components["schemas"]["FriendSearchResponse"];
export type SendFriendRequestResult = components["schemas"]["SendFriendRequestResult"];
export type ServerChannelConversationDetails = components["schemas"]["ServerChannelConversationDetails"];
export type DmConversationDetails = components["schemas"]["DmConversationDetails"];
export type MentionSource = components["schemas"]["MentionSource"];
export type MessageSearchDto = components["schemas"]["MessageSearchDto"];
export type MessageSearchPage = components["schemas"]["MessageSearchPage"];
export type EmojiEntryDto = components["schemas"]["EmojiEntryDto"];
export type ReactionAction = components["schemas"]["ReactionAction"];

export type MessageItemReactionDto = {
  messageId: string;
  reactionsCounts: Record<string, number>;
};

export type UserReactionActionDto = {
  messageId: string;
  reactionActions: Record<string, ReactionAction>;
};
