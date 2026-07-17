export interface UserAuthorizationInfo {
    id: string;
    userName: string;
    isVerified: boolean;
    isProfileSetup: boolean;
    roles: string[];
    permissions: string[];
}

export interface LoginResponse {
    accessToken: string;
    authorization: UserAuthorizationInfo;
}

export interface RegisterResponse {
    code: string;
    message: string;
}

export interface RefreshResponse {
    accessToken: string;
    authorization: UserAuthorizationInfo;
}

export interface UploadAvatarResponse {
    url: string;
}