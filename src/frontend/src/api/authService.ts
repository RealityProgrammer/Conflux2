import apiClient, { setAccessToken, hasAccessToken } from "./client.ts";
import type { LoginRequest, RegisterRequest } from "./types/requests.ts";
import type { ApiResponse, LoginResponse, RegisterResponse, RefreshResponse } from "./types/responses.ts";
import { type AxiosResponse, HttpStatusCode } from "axios";
import { handleApiError } from "../utils/errorHelpers.ts";

let activeRefreshPromise: Promise<ApiResponse<RefreshResponse>> | null = null;

export const authService = {
    login: async (request: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
        try {
            const response: AxiosResponse<LoginResponse> = await apiClient.post("/auth/login", request);

            if (response.status === HttpStatusCode.Ok) {
                setAccessToken(response.data.accessToken);
                localStorage.setItem("hasSession", "true");
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
        // optimization: since unlogged in user can also trigger refresh, we gonna keep a flag that denotes
        // whether there is a session around, it will allow us to bail out early without having new user
        // tanking the server.

        // NOTE: THIS FLAG IS ONLY USED FOR REFRESHING OPTIMIZATION

        if (localStorage.getItem("hasSession") !== "true") {
            return Promise.resolve({
                statusCode: HttpStatusCode.Unauthorized,
                data: null,
                message: "No session active."
            });
        }

        // prevent multiple refresh requests.
        if (!activeRefreshPromise) {
            activeRefreshPromise = apiClient.post("/auth/refresh", {}, {
                withCredentials: true
            }).then((response: AxiosResponse<RefreshResponse>): ApiResponse<RefreshResponse> => {
                if (response.status === HttpStatusCode.Ok) {
                    setAccessToken(response.data.accessToken);
                    localStorage.setItem("hasSession", "true");

                    return {
                        statusCode: response.status,
                        data: response.data,
                    }
                } else {
                    setAccessToken(null);
                    localStorage.removeItem("hasSession");

                    return {
                        statusCode: response.status,
                        data: null,
                    }
                }
            }).catch(err => {
                setAccessToken(null);
                localStorage.removeItem("hasSession");

                return handleApiError(err);
            }).finally(() => {
                activeRefreshPromise = null;    // clear when finish
            });
        }

        return activeRefreshPromise;
    },

    logout: async () : Promise<ApiResponse<null>> => {
        const response: AxiosResponse = await apiClient.post('/auth/logout');
        setAccessToken(null);

        return {
            statusCode: response.status,
        }
    },

    hasAccessToken: () => {
        return hasAccessToken();
    },
};