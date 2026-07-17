import apiClient from "./client.ts";
import type {EmailConfirmationRequest, LoginRequest, RegisterRequest} from "./requests.ts";
import type {
    LoginResponse,
    RefreshResponse,
    UserAuthorizationInfo
} from "./responses.ts";
import axios, { type AxiosResponse, HttpStatusCode } from "axios";
import { handleApiError } from "../utils/errorHelpers.ts";
import type { ApiResponse } from "./apiResponse.ts";
import Cookies from "js-cookie";

let activeRefreshPromise: Promise<ApiResponse<RefreshResponse>> | null = null;
let activeGetAuthorizationInfoPromise: Promise<ApiResponse<UserAuthorizationInfo | null>> | null = null;

let cachedAuthorization : UserAuthorizationInfo | null = null;

export const authService = {
    login: async (request: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
        try {
            const response: AxiosResponse<LoginResponse> = await apiClient.post("/auth/login", request);

            if (response.status === HttpStatusCode.Ok) {
                localStorage.setItem("hasSession", "true");
                cachedAuthorization = response.data.authorization;
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

    register: async (request: RegisterRequest): Promise<ApiResponse> => {
        try {
            const response: AxiosResponse = await apiClient.post("/auth/register", request);

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
                data: null,
                message: "No session active."
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
            activeRefreshPromise = axios.post<RefreshResponse>(`${import.meta.env.VITE_BACKEND_URL}/auth/refresh`, {}, {
                withCredentials: true,
                headers,
            }).then((response: AxiosResponse<RefreshResponse>): ApiResponse<RefreshResponse> => {
                if (response.status === HttpStatusCode.Ok) {
                    localStorage.setItem("hasSession", "true");
                    cachedAuthorization = response.data.authorization;

                    return {
                        statusCode: response.status,
                        data: response.data,
                    }
                } else {
                    localStorage.removeItem("hasSession");
                    cachedAuthorization = null;

                    return {
                        statusCode: response.status,
                        data: null,
                    }
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

    logout: async (): Promise<ApiResponse<void>> => {
        const response: AxiosResponse = await apiClient.post('/auth/logout');
        cachedAuthorization = null;
        localStorage.removeItem("hasSession");

        return {
            statusCode: response.status,
        }
    },

    hasAuthorizationInfo: () => {
        return !!cachedAuthorization;
    },

    getAuthorizationInfo: async (): Promise<ApiResponse<UserAuthorizationInfo | null>> => {
        if (cachedAuthorization) {
            return {
                statusCode: HttpStatusCode.Ok,
                data: cachedAuthorization,
            };
        }

        if (localStorage.getItem("hasSession") !== "true") {
            return Promise.resolve<ApiResponse<UserAuthorizationInfo | null>>({
                statusCode: HttpStatusCode.Unauthorized,
                data: null,
            });
        }

        try {
            if (!activeGetAuthorizationInfoPromise) {
                activeGetAuthorizationInfoPromise =
                    apiClient.get("/auth/authorization-info")
                        .then((response: AxiosResponse<UserAuthorizationInfo | null>) => {
                            if (response.status === HttpStatusCode.Ok) {
                                cachedAuthorization = response.data;

                                return {
                                    statusCode: response.status,
                                    data: response.data,
                                };
                            } else {
                                cachedAuthorization = null;
                                localStorage.removeItem("hasSession");

                                return {
                                    statusCode: response.status,
                                    data: null,
                                };
                            }
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

    sendVerifyEmail: async (): Promise<ApiResponse<void>> => {
        try {
            const response: AxiosResponse<ApiResponse<void>> = await apiClient.post("/auth/send-verify-email");

            return {
                statusCode: response.status,
            }
        } catch (error) {
            return handleApiError(error);
        }
    },

    confirmEmail: async (request: EmailConfirmationRequest): Promise<ApiResponse<void>> => {
        try {
            const response: AxiosResponse<ApiResponse<void>> = await apiClient.post("/auth/confirm-email", request);

            if (response.status === HttpStatusCode.Ok) {
                // refresh the authorization information.
                await authService.refresh();
            }

            return {
                statusCode: response.status,
            }
        } catch (error) {
            return handleApiError(error);
        }
    },
};