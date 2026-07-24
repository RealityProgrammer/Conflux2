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

export interface UserBasicProfileInfo {
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

export type DiscoverUserElement = {
    userId: string;
    userName: string;
    displayName: string;
    hasAvatar: boolean;
}

export interface DiscoverUsersResponse {
    users: DiscoverUserElement[];
    totalCount: number;
}

export type FieldErrors<F extends keyof any> = Record<F, string[]>;