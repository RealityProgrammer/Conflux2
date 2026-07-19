import apiClient from "./client.ts";
import type { EmailConfirmationRequest, LoginRequest, RegisterRequest } from "./requests.ts";
import type { LoginResponse, RefreshResponse, UserAuthorizationInfo } from "./responses.ts";
import axios, { type AxiosResponse, HttpStatusCode } from "axios";
import { handleApiError } from "../utils/errorHelpers.ts";
import type { ApiResponse, BackendApiResponse } from "./apiResponse.ts";
import Cookies from "js-cookie";

let activeRefreshPromise: Promise<ApiResponse<RefreshResponse>> | null = null;
let activeGetAuthorizationInfoPromise: Promise<ApiResponse<UserAuthorizationInfo | null>> | null = null;

let cachedAuthorization : UserAuthorizationInfo | null = null;

export const authService = {
    login: async (request: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
        try {
            const response: AxiosResponse<BackendApiResponse<LoginResponse>> =
                await apiClient.post("/auth/login", request);

            if (response.status === HttpStatusCode.Ok) {
                localStorage.setItem("hasSession", "true");
                cachedAuthorization = response.data.data?.authorization!;
            }

            return {
                statusCode: response.status,
                message: response.data.message,
                data: response.data.data,
            };
        } catch (error) {
            return handleApiError(error);
        }
    },

    register: async (request: RegisterRequest): Promise<ApiResponse> => {
        try {
            const response: AxiosResponse<BackendApiResponse> =
                await apiClient.post<BackendApiResponse>("/auth/register", request);

            return {
                statusCode: response.status,
                message: response.data.message,
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
                message: "No session active.",
                data: null,
            });
        }

        // prevent multiple refresh requests.
        if (!activeRefreshPromise) {
            // manually attach header, no idea if this is needed but im too lazy to test
            const csrfToken = Cookies.get('XSRF-TOKEN');
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (csrfToken) {
                headers['X-CSRF-TOKEN'] = csrfToken;
            }

            // use raw axios to prevent interception
            activeRefreshPromise = axios.post<BackendApiResponse<RefreshResponse>>(`${import.meta.env.VITE_BACKEND_URL}/auth/refresh`, {}, {
                headers,
            }).then((response: AxiosResponse<BackendApiResponse<RefreshResponse>>): ApiResponse<RefreshResponse> => {
                if (response.status === HttpStatusCode.Ok) {
                    localStorage.setItem("hasSession", "true");
                    cachedAuthorization = response.data.data?.authorization!;
                } else {
                    localStorage.removeItem("hasSession");
                    cachedAuthorization = null;
                }

                return {
                    statusCode: response.status,
                    message: response.data?.message,
                    data: response.data?.data,
                }
            }).catch((err: any) => {
                localStorage.removeItem("hasSession");
                cachedAuthorization = null;

                return handleApiError(err);
            }).finally(() => {
                activeRefreshPromise = null;    // clear when finish
            });
        }

        return activeRefreshPromise;
    },

    logout: async (): Promise<ApiResponse> => {
        const response: AxiosResponse = await apiClient.post<BackendApiResponse>('/auth/logout');
        cachedAuthorization = null;
        localStorage.removeItem("hasSession");

        return {
            statusCode: response.status,
            message: response.data?.message,
        }
    },

    hasAuthorizationInfo: () => {
        return !!cachedAuthorization;
    },

    getAuthorizationInfo: async (): Promise<ApiResponse<UserAuthorizationInfo>> => {
        if (cachedAuthorization) {
            return Promise.resolve<ApiResponse<UserAuthorizationInfo>>({
                statusCode: HttpStatusCode.Ok,
                data: cachedAuthorization,
            });
        }

        if (localStorage.getItem("hasSession") !== "true") {
            return Promise.resolve<ApiResponse<UserAuthorizationInfo>>({
                statusCode: HttpStatusCode.Unauthorized,
                data: null,
            });
        }

        try {
            if (!activeGetAuthorizationInfoPromise) {
                activeGetAuthorizationInfoPromise =
                    apiClient.get<BackendApiResponse<UserAuthorizationInfo>>("/auth/authorization-info")
                        .then((response: AxiosResponse<BackendApiResponse<UserAuthorizationInfo>>): ApiResponse<UserAuthorizationInfo> => {
                            if (response.status === HttpStatusCode.Ok) {
                                cachedAuthorization = response.data.data!;
                            } else {
                                cachedAuthorization = null;
                                localStorage.removeItem("hasSession");
                            }

                            return {
                                statusCode: response.status,
                                message: response.data?.message,
                                data: response.data?.data,
                            };
                        }).catch((err) => {
                            cachedAuthorization = null;
                            localStorage.removeItem("hasSession");

                            return handleApiError(err);
                        }).finally(() => {
                            activeGetAuthorizationInfoPromise = null;
                        });
            }

            return activeGetAuthorizationInfoPromise;
        } catch (error) {
            return handleApiError(error);
        }
    },

    sendVerifyEmail: async (): Promise<ApiResponse> => {
        try {
            const response: AxiosResponse<BackendApiResponse> =
                await apiClient.post<BackendApiResponse>("/auth/send-verify-email");

            return {
                statusCode: response.status,
                message: response.data?.message,
            }
        } catch (error) {
            return handleApiError(error);
        }
    },

    confirmEmail: async (request: EmailConfirmationRequest): Promise<ApiResponse> => {
        try {
            const response: AxiosResponse<BackendApiResponse> =
                await apiClient.post<BackendApiResponse>("/auth/confirm-email", request);

            if (response.status === HttpStatusCode.Ok) {
                // refresh the authorization information.
                await authService.refresh();
            }

            return {
                statusCode: response.status,
                message: response.data?.message,
            }
        } catch (error) {
            return handleApiError(error);
        }
    },
};