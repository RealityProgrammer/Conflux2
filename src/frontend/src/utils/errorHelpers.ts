import type { ApiResponse } from "../api/responses.ts";
import {AxiosError, HttpStatusCode} from "axios";

export function handleApiError<T = any>(error: any): ApiResponse<T> {
    if (error instanceof AxiosError) {
        return {
            statusCode: error.status ?? HttpStatusCode.InternalServerError,
            message: error.message,
        }
    } else if (error instanceof Error) {
        return {
            statusCode: HttpStatusCode.InternalServerError,
            message: error.message,
        }
    }

    return {
        statusCode: HttpStatusCode.InternalServerError,
        message: "Error occurred: " + error,
    }
}