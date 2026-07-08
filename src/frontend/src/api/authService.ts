import apiClient from "./client.ts";
import type { LoginRequest, RegisterRequest } from "./types/requests.ts";
import type { ApiResponse, LoginResponse, RegisterResponse } from "./types/responses.ts";
import { type AxiosResponse } from "axios";
import { handleApiError } from "../utils/errorHelpers.ts";

export const authService = {
    login: async (request: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
        try {
            const response: AxiosResponse<LoginResponse> = await apiClient.post("/auth/login", request);

            return {
                statusCode: response.status,
                message: null,
                data: response.data,
            };
        } catch (error) {
            return handleApiError(error);
        }
    },

    register: async (request: RegisterRequest): Promise<ApiResponse<RegisterResponse>> => {
        try {
            const response: AxiosResponse<RegisterResponse> = await apiClient.post("/auth/register", request);

            return {
                statusCode: response.status,
                message: response.data.message,
                errorCode: response.data.code,
                data: null,
            }
        } catch (error) {
            return handleApiError(error);
        }
    },
};