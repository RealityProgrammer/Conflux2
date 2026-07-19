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