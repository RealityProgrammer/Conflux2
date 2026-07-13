export interface UserAuthorizationInfo {
    userName: string;
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