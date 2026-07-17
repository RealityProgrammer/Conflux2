export type ApiResponse<T = void> = {
    statusCode: number;
    message?: string | null;
} & (T extends void ? {} : { data?: T | null });