export interface ApiResponse {
    message: string | null;
    statusCode: number;
}

export interface ApiPayloadResponse<T> extends ApiResponse {
    data?: T;
}