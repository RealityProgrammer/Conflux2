export interface ApiResponse<T = any> {
    statusCode: number;
    errorCode?: string | null;
    message?: string | null;
    data?: T | null;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
}

export interface RegisterResponse {
    code: string;
    message: string;
}