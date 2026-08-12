import { apiClient } from "./client.ts";
import type {
    BackendResponse,
    ServiceResponse,
} from "./responses.ts";
import { type AxiosError, type AxiosResponse } from "axios";
import {handleAxiosError} from "./errorHandling.ts";

export const csrfService = {
    requestCsrfToken: async (): Promise<ServiceResponse> => {
        try {
            const response: AxiosResponse<BackendResponse> =
                await apiClient.get<BackendResponse>('/csrf/token');

            return {
                success: true,
                statusCode: response.status,
            };
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },
};