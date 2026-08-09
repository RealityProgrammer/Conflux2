import type { HttpStatusCode } from "axios";

export type Error = {
    code: string;
    message: string;
    details?: any | null;
};

export type ServiceResponse<T = void> = {
    success: boolean;
    statusCode: HttpStatusCode;
    error?: Error | null;
} & (T extends void ? {} : { data?: T | null });

export type BackendResponse<T = void> = Omit<ServiceResponse<T>, 'success'>;

export interface UserAuthorizationInfo {
    id: string;
    isVerified: boolean;
    isProfileSetup: boolean;
    roles: string[];
    permissions: string[];
}

export type UserBasicProfileSummary = {
    id: string;
    userName: string;
    displayName: string;
    hasAvatar: boolean;
}

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

export type DirectMessageChannelSummary = {
    otherUser: UserBasicProfileSummary;
}

export type Attachment = {
    id: string;
    type: string;
}

export type TimelineMessageBlockDto = {
    senderUserId: string;
    messages: TimelineMessageDto[];
}

export type TimelineMessageDto = {
    id: string;
    body: string | null;
    attachments: Attachment[];
    createdAt: Date;
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
    users: UserBasicProfileSummary[];
    hasMoreBefore?: boolean;
    hasMoreAfter?: boolean;
}
