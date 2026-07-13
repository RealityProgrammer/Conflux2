export interface ApiResponse<T = any> {
    statusCode: number;
    errorCode?: string | null;
    message?: string | null;
    data?: T | null;
}