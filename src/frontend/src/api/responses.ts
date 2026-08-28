import type {HttpStatusCode} from "axios";
import type {GetUserFullProfileQuery, GetUserIdentityProfileQuery} from "../graphql/queries.ts";

export type ServiceError = {
  code: string;
  message: string;
  details?: any | null;
};

export type ServiceResponse<T = void> = {
  success: boolean;
  statusCode: HttpStatusCode;
  error?: ServiceError | null;
} & (T extends void ? {} : { data?: T | null });

export type BackendResponse<T = void> = Omit<ServiceResponse<T>, 'success'>;

export interface UserAuthorizationInfo {
  id: string;
  isVerified: boolean;
  isProfileSetup: boolean;
  roles: string[];
  permissions: string[];
}

export type UserIdentityProfileDto = NonNullable<GetUserIdentityProfileQuery['userById']>;
export type UserFullProfileDto = NonNullable<GetUserFullProfileQuery['userById']>

export interface LoginResponse {
  authorization: UserAuthorizationInfo;
  tokenType: string;
  accessToken: string;
}

export interface RefreshResponse {
  authorization: UserAuthorizationInfo;
  tokenType: string;
  accessToken: string;
}

export enum UserRelationshipStatus {
  Stranger = "Stranger",
  OutcomingRequest = "OutcomingRequest",
  IncomingRequest = "IncomingRequest",
  Friended = "Friended",
}

export type DiscoverFriendElement = {
  userId: string;
  userName: string;
  displayName: string;
  hasAvatar: boolean;
  status: UserRelationshipStatus;
}

export type QueryPendingRequestElement = {
  userId: string;
  userName: string;
  displayName: string;
  hasAvatar: boolean;
  status: UserRelationshipStatus;
}

export type PaginatedResponse<T> = {
  elements: T[];
  totalCount: number;
}

export type FieldErrors<F extends keyof any> = Record<F, string[]>;

export interface SendFriendRequestResponse {
  status: UserRelationshipStatus;
}

export type DirectMessageResolutionResponse = {
  channelId: string;
}

export type DmChannelSummary = {
  otherUser: UserIdentityProfileDto;
}

export type Attachment = {
  id: string;
  type: string;
}

export type TimelineMessageBlockDto = {
  senderUserId: string;
  messages: TimelineMessageDto[];
}

export type ReplyToMessageDto = {
  messageId: string;
  senderUserId: string;
  bodySnippet: string | null;
  hasMoreBody: boolean;
  attachmentCount: number;
}

export type TimelineMessageDto = {
  id: string;
  body: string | null;
  attachments: Attachment[];
  createdAt: Date;
  replyTo?: ReplyToMessageDto;
}

export type MessageDto = {
  id: string;
  senderUserId: string;
  body: string | null;
  attachments: Attachment[];
  createdAt: Date;
  replyToId?: string;
}

export type GetMessagesResponse = {
  messageGroups: TimelineMessageBlockDto[];
  users: UserIdentityProfileDto[];
  hasMoreBefore?: boolean;
  hasMoreAfter?: boolean;
}

export type DmConversationListItemDto = {
  channelId: string;
  userProfile: UserIdentityProfileDto;
}

export type CommunityServerChannelIdentityDto = {
  id: string;
  name: string;
  channelType: "CommunityServerText" | "CommunityServerVoice";
}

export type ChannelCategoryIdentityDto = {
  id: string | null;
  name: string | null;
  channels: CommunityServerChannelIdentityDto[];
}

export type CommunityServerSummaryDto = {
  name: string;
  description: string | null;
  hasAvatar: boolean;
  channelCategories: ChannelCategoryIdentityDto[];
}

export enum ServerPermissions {
  None = 0,

  CreateRole = 1 << 0,
  UpdateRole = 1 << 1,
  DeleteRole = 1 << 2,

  CreateChannel = 1 << 3,
  DeleteChannel = 1 << 4,

  All = 0xFFFFFFFF,
}

export type CommunityServerRoleDto = {
  id: string;
  name: string;
  permissions: ServerPermissions;
  authorizeLevel: number;
}

export type ServerMemberPermissionsDto = {
  memberId: string;
  effectivePermissions: ServerPermissions;
  authorizeLevel: number;
  roles: CommunityServerRoleDto[];
}