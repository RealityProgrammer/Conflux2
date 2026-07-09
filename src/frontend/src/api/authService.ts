import apiClient, { setAccessToken } from "./client.ts";
import type { LoginRequest, RegisterRequest } from "./types/requests.ts";
import type { ApiResponse, LoginResponse, RegisterResponse, RefreshResponse } from "./types/responses.ts";
import { type AxiosResponse } from "axios";
import { handleApiError } from "../utils/errorHelpers.ts";

export const authService = {
    login: async (request: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
        try {
            const response: AxiosResponse<LoginResponse> = await apiClient.post("/auth/login", request);

            if (response.status === 200) {
                setAccessToken(response.data.accessToken);
            }

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

    refresh: async (): Promise<ApiResponse<RefreshResponse>> => {
        try {
            const response: AxiosResponse<RefreshResponse> = await apiClient.post('/auth/refresh', {}, {
                withCredentials: true
            });

            if (response.status === 200) {
                setAccessToken(response.data.accessToken);

                return {
                    statusCode: response.status,
                    data: { accessToken: response.data.accessToken },
                }
            } else {
                setAccessToken(null);

                return {
                    statusCode: response.status,
                    data: null,
                }
            }
        } catch (error) {
            return handleApiError(error);
        }
    },

    logout: async () : Promise<ApiResponse<null>> => {
        const response: AxiosResponse = await apiClient.post('/auth/logout');
        setAccessToken(null);

        return {
            statusCode: response.status,
        }
    }
};