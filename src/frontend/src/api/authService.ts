import apiClient, { hasAuthorizationInfo, getAuthorizationInfo, setAuthorizationInfo } from "./client.ts";
import type { LoginRequest, RegisterRequest } from "./requests.ts";
import type {
    LoginResponse,
    RegisterResponse,
    RefreshResponse,
    UserAuthorizationInfo
} from "./responses.ts";
import { type AxiosResponse, HttpStatusCode } from "axios";
import { handleApiError } from "../utils/errorHelpers.ts";
import type { ApiResponse } from "./apiResponse.ts";

let activeRefreshPromise: Promise<ApiResponse<RefreshResponse>> | null = null;
let activeGetAuthorizationInfoPromise: Promise<ApiResponse<UserAuthorizationInfo | null>> | null = null;

export const authService = {
    login: async (request: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
        try {
            const response: AxiosResponse<LoginResponse> = await apiClient.post("/auth/login", request);

            if (response.status === HttpStatusCode.Ok) {
                localStorage.setItem("hasSession", "true");
                setAuthorizationInfo(response.data.authorization);
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
            activeRefreshPromise = apiClient.post("/auth/refresh")
                .then((response: AxiosResponse<RefreshResponse>): ApiResponse<RefreshResponse> => {
                    if (response.status === HttpStatusCode.Ok) {
                        localStorage.setItem("hasSession", "true");

                        return {
                            statusCode: response.status,
                            data: response.data,
                        }
                    } else {
                        localStorage.removeItem("hasSession");

                        return {
                            statusCode: response.status,
                            data: null,
                        }
                    }
                }).catch((err: any) => {
                    localStorage.removeItem("hasSession");

                    return handleApiError(err);
                }).finally(() => {
                    activeRefreshPromise = null;    // clear when finish
                });
        }

        return activeRefreshPromise;
    },

    logout: async (): Promise<ApiResponse<null>> => {
        const response: AxiosResponse = await apiClient.post('/auth/logout');
        setAuthorizationInfo(null);

        return {
            statusCode: response.status,
        }
    },

    hasAuthorizationInfo: () => {
        return hasAuthorizationInfo();
    },

    getAuthorizationInfo: async (): Promise<ApiResponse<UserAuthorizationInfo | null>> => {
        if (hasAuthorizationInfo()) {
            return {
                statusCode: HttpStatusCode.Ok,
                data: getAuthorizationInfo()!,
            };
        }

        try {
            if (!activeGetAuthorizationInfoPromise) {
                activeGetAuthorizationInfoPromise =
                    apiClient.get("/auth/authorization-info")
                        .then((response: AxiosResponse<UserAuthorizationInfo | null>) => {
                            return {
                                statusCode: response.status,
                                data: response.data,
                            }
                        }).catch((err) => {
                            // nothing to do just yet so just throw the error back.
                            throw err;
                        }).finally(() => {
                            activeGetAuthorizationInfoPromise = null;
                        });

                return activeGetAuthorizationInfoPromise;
            }

            const response: AxiosResponse<UserAuthorizationInfo | null> = await apiClient.get("/auth/authorization-info");

            return {
                statusCode: HttpStatusCode.Ok,
                data: response.data,
            }
        } catch (error) {
            return handleApiError(error);
        }
    },

    sendVerifyEmail: async (): Promise<AxiosResponse<ApiResponse<void>>> => {
        try {
            const response: AxiosResponse<ApiResponse<void>> = await apiClient.post("/auth/send-verify-email");
            return response;
        } catch (error) {
            return handleApiError(error);
        }
    }
};