export interface ApiResponse<T = any> {
    statusCode: number;
    errorCode?: string | null;
    message?: string | null;
    data?: T | null;
}

export interface UserAuthorizationInfo {
    username: string;
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