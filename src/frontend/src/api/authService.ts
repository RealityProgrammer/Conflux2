import apiClient from "./client.ts";
import type {EmailConfirmationRequest, LoginRequest, RegisterRequest} from "./requests.ts";
import type {
    BackendResponse,
    LoginResponse,
    RefreshResponse,
    ServiceResponse,
    UserAuthorizationInfo
} from "./responses.ts";
import axios, {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import Cookies from "js-cookie";
import {handleAxiosError} from "./errorHandling.ts";
import {csrfService} from "./csrfService.ts";

let activeRefreshPromise: Promise<ServiceResponse<RefreshResponse>> | null = null;
let activeGetAuthorizationInfoPromise: Promise<ServiceResponse<UserAuthorizationInfo | null>> | null = null;

let cachedAuthorization : UserAuthorizationInfo | null = null;

export const authService = {
    login: async (request: LoginRequest): Promise<ServiceResponse<LoginResponse>> => {
        try {
            const response: AxiosResponse<BackendResponse<LoginResponse>> =
                await apiClient.post("/auth/login", request);

            localStorage.setItem("hasSession", "true");
            cachedAuthorization = response.data.data?.authorization!;

            await csrfService.requestCsrfToken();

            return {
                success: true,
                statusCode: response.status,
                data: response.data.data,
            };
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse<LoginResponse>>;
            return handleAxiosError(axiosError);
        }
    },

    register: async (request: RegisterRequest): Promise<ServiceResponse> => {
        try {
            const response = await apiClient.post<BackendResponse>("/auth/register", request);

            return {
                success: true,
                statusCode: response.status,
            }
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },

    refresh: async (): Promise<ServiceResponse<RefreshResponse>> => {
        // optimization: since unlogged in user can also trigger refresh, we gonna keep a flag that denotes
        // whether there is a session around, it will allow us to bail out early without having new user
        // tanking the server.

        // NOTE: THIS FLAG IS ONLY USED FOR REFRESHING OPTIMIZATION

        if (localStorage.getItem("hasSession") !== "true") {
            return {
                success: false,
                statusCode: HttpStatusCode.Unauthorized,
                error: {
                    code: "InactiveSession",
                    message: "No active session.",
                }
            };
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
            activeRefreshPromise = axios.post<BackendResponse<RefreshResponse>>(
                `${import.meta.env.VITE_BACKEND_URL}/auth/refresh`,
                {},
                { headers }
            ).then(async (response: AxiosResponse<BackendResponse<RefreshResponse>>): Promise<ServiceResponse<RefreshResponse>> => {
                localStorage.setItem("hasSession", "true");
                cachedAuthorization = response.data.data?.authorization!;

                await csrfService.requestCsrfToken();

                return {
                    success: true,
                    statusCode: response.status,
                    data: response.data?.data,
                }
            }).catch(async (err: any): Promise<ServiceResponse<RefreshResponse>> => {
                const axiosError = err as AxiosError<BackendResponse<RefreshResponse>>;

                localStorage.removeItem("hasSession");
                cachedAuthorization = null;

                try {
                    // get anonymous token to wipe out the old ones because antiforgery token is identity-based
                    await csrfService.requestCsrfToken();
                } catch (csrfErr) {
                    console.error("Failed to reset to anonymous CSRF token after refresh failure", csrfErr);
                }

                return handleAxiosError(axiosError);
            }).finally(() => {
                activeRefreshPromise = null;    // clear when finish
            });
        }

        return activeRefreshPromise;
    },

    logout: async (): Promise<ServiceResponse> => {
        try {
            const response: AxiosResponse = await apiClient.post<BackendResponse>('/auth/logout');
            cachedAuthorization = null;
            localStorage.removeItem("hasSession");

            await csrfService.requestCsrfToken();

            return {
                success: true,
                statusCode: response.status,
            }
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },

    hasAuthorizationInfo: () => {
        return !!cachedAuthorization;
    },

    getAuthorizationInfo: async (): Promise<ServiceResponse<UserAuthorizationInfo>> => {
        if (cachedAuthorization) {
            return {
                success: true,
                statusCode: HttpStatusCode.Ok,
                data: cachedAuthorization,
            };
        }

        if (localStorage.getItem("hasSession") !== "true") {
            return {
                success: false,
                statusCode: HttpStatusCode.Unauthorized,
                data: null,
            };
        }

        if (!activeGetAuthorizationInfoPromise) {
            activeGetAuthorizationInfoPromise = apiClient
                .get<BackendResponse<UserAuthorizationInfo>>("/auth/authorization-info")
                .then((response: AxiosResponse<BackendResponse<UserAuthorizationInfo>>): ServiceResponse<UserAuthorizationInfo> => {
                    cachedAuthorization = response.data.data!;

                    return {
                        success: true,
                        statusCode: response.status,
                        data: response.data.data,
                    };
                }).catch((err) => {
                    cachedAuthorization = null;
                    localStorage.removeItem("hasSession");

                    return handleAxiosError(err);
                }).finally(() => {
                    activeGetAuthorizationInfoPromise = null;
                });
        }

        return activeGetAuthorizationInfoPromise;
    },

    sendVerifyEmail: async (): Promise<ServiceResponse> => {
        try {
            const response: AxiosResponse<BackendResponse> =
                await apiClient.post<BackendResponse>("/auth/send-verify-email");

            return {
                success: true,
                statusCode: response.status,
            }
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },

    confirmEmail: async (request: EmailConfirmationRequest): Promise<ServiceResponse> => {
        try {
            const response: AxiosResponse<BackendResponse> =
                await apiClient.post<BackendResponse>("/auth/confirm-email", request);

            if (response.status === HttpStatusCode.Ok) {
                // refresh the authorization information.
                await authService.refresh();
            }

            return {
                success: true,
                statusCode: response.status,
            }
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },
};