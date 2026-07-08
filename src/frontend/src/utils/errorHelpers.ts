import type { ApiResponse } from "../api/types/responses.ts";
import { AxiosError } from "axios";

export function handleApiError<T = any>(error: any): ApiResponse<T> {
    if (error instanceof AxiosError) {
        return {
            statusCode: error.status!,
            message: "Invalid login credential.",
        }
    } else if (error instanceof Error) {
        return {
            statusCode: 520,
            message: error.message,
        }
    }

    return {
        statusCode: 500,
        message: "Error occurred: " + error,
    }
}