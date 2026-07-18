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
    accessToken: string;
    authorization: UserAuthorizationInfo;
}

export interface RefreshResponse {
    accessToken: string;
    authorization: UserAuthorizationInfo;
}

export interface UploadAvatarResponse {
    url: string;
}