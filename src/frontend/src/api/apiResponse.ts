export type ApiResponse<T = void> = {
    statusCode: number;
    message?: string | null;
} & (T extends void ? {} : { data?: T | null });

export type BackendApiResponse<T = void> = Omit<ApiResponse<T>, "statusCode">;