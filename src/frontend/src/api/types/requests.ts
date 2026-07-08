export interface LoginRequest {
    email: string;
    password: string;
    remember: boolean;
}

export interface RegisterRequest {
    email: string;
    password: string;
    confirmPassword: string;
}

export interface RefreshRequest {
    email: string;
    refreshToken: string;
}