import {apiClient} from "./client.ts";
import type {
  LoginRequest,
  RegisterRequest,
  RestoreAccountResponse,
  SessionsQueryResult
} from "./types.ts";
import type {
  BackendResponse,
  LoginResponse,
  RefreshResponse,
  ServiceResponse,
  UserAuthorizationInfo
} from "./types.ts";
import axios, {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import Cookies from "js-cookie";
import {handleAxiosError} from "./errorHandling.ts";
import {csrfService} from "./csrfService.ts";
import type {UserAccountDeleteReason} from "./schema.ts";
import {useAuthStore} from "../store/useAuthStore.ts";

export const authService = {
  login: async (request: LoginRequest): Promise<ServiceResponse<LoginResponse>> => {
    try {
      const response: AxiosResponse<BackendResponse<LoginResponse>> = 
        await apiClient.post("/auth/login", request);
      
      if (response.status === HttpStatusCode.Ok) {
        useAuthStore.getState().setCachedAuthorization(response.data.data!.authorization);
      }

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

    const { hasSession, activeRefreshPromise, setCachedAuthorization, setActiveRefreshPromise, clearSession } = useAuthStore.getState();

    if (!hasSession) {
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
    if (activeRefreshPromise) {
      return activeRefreshPromise;
    }

    const promise = (async () => {
      try {
        const csrfToken = Cookies.get('XSRF-TOKEN');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (csrfToken) {
          headers['X-CSRF-TOKEN'] = csrfToken;
        }

        const response = await axios.post<BackendResponse<RefreshResponse>>(
          `/api/auth/refresh`,
          {},
          { headers }
        );

        setCachedAuthorization(response.data.data!.authorization);

        await csrfService.requestCsrfToken();

        return {
          success: true,
          statusCode: response.status,
          data: response.data?.data,
        };
      } catch (err) {
        const axiosError = err as AxiosError<BackendResponse<RefreshResponse>>;
        clearSession();

        try {
          await csrfService.requestCsrfToken();
        } catch (csrfErr) {
          console.error("Failed to reset to anonymous CSRF token after refresh failure", csrfErr);
        }

        return handleAxiosError(axiosError);
      } finally {
        setActiveRefreshPromise(null);
      }
    })();

    setActiveRefreshPromise(promise);
    return promise;
  },

  logout: async (): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse = await apiClient.post<BackendResponse>('/auth/logout');
      useAuthStore.getState().clearSession();

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
  
  logoutAll: async (): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse = await apiClient.post<BackendResponse>("/auth/logout-all");
      useAuthStore.getState().clearSession();

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

  deleteAccount: async (reason: UserAccountDeleteReason, extraMessage: string | null, restorationPassword: string, idempotencyKey: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.post<BackendResponse>(
          "auth/delete-account",
          { reason, extraMessage, restorationPassword },
          { headers: { "Idempotency-Key": idempotencyKey } }
        );

      useAuthStore.getState().clearSession();
      
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

  restoreAccount: async (restorationPassword: string): Promise<ServiceResponse<RestoreAccountResponse>> => {
    try {
      const response: AxiosResponse<BackendResponse<RestoreAccountResponse>> = 
        await apiClient.post<BackendResponse<RestoreAccountResponse>>(
          "auth/restore-account",
          { restorationPassword }
        );

      useAuthStore.getState().clearSession();

      await csrfService.requestCsrfToken();

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<RestoreAccountResponse>>;
      return handleAxiosError(axiosError);
    }
  },

  getAuthorizationInfo: async (): Promise<ServiceResponse<UserAuthorizationInfo>> => {
    const { 
      cachedAuthorization, 
      hasSession, 
      activeGetAuthorizationInfoPromise, 
      setActiveGetAuthorizationInfoPromise,
      clearSession,
      setCachedAuthorization,
    } = useAuthStore.getState();
    
    if (cachedAuthorization) {
      return {
        success: true,
        statusCode: HttpStatusCode.Ok,
        data: cachedAuthorization,
      };
    }

    if (!hasSession) {
      return {
        success: false,
        statusCode: HttpStatusCode.Unauthorized,
        data: null,
      };
    }

    if (activeGetAuthorizationInfoPromise) {
      return activeGetAuthorizationInfoPromise;
    }

    const promise = apiClient
      .get<BackendResponse<UserAuthorizationInfo>>("/auth/authorization-info")
      .then((response): ServiceResponse<UserAuthorizationInfo> => {
        const data = response.data.data!;
        setCachedAuthorization(data);

        return {
          success: true,
          statusCode: response.status,
          data,
        };
      })
      .catch((err) => {
        clearSession();
        return handleAxiosError(err);
      })
      .finally(() => {
        setActiveGetAuthorizationInfoPromise(null);
      });

    setActiveGetAuthorizationInfoPromise(promise);
    return promise;
  },

  resendConfirmEmail: async (): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.post<BackendResponse>("/auth/resend-confirm-email");

      return {
        success: true,
        statusCode: response.status,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  confirmEmail: async (email: string, confirmationCode: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.post<BackendResponse>("/auth/confirm-email", {
          email,
          confirmationCode,
        });

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
  
  changePassword: async (oldPassword: string, newPassword: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.post<BackendResponse>("/auth/change-password", { oldPassword, newPassword });

      return {
        success: true,
        statusCode: response.status,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  forgotPassword: async (email: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.post<BackendResponse>("/auth/forgot-password", { email });

      return {
        success: true,
        statusCode: response.status,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },
  
  resetPassword: async (email: string, token: string, password: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.post<BackendResponse>("/auth/reset-password", {
          email,
          token,
          password
        });
      
      return {
        success: true,
        statusCode: response.status,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  getSessions: async (): Promise<ServiceResponse<SessionsQueryResult>> => {
    try {
      const response: AxiosResponse<BackendResponse<SessionsQueryResult>> = 
        await apiClient.get<BackendResponse>("/auth/sessions");

      return {
        success: true,
        statusCode: response.status,
        data: response.data.data,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse<SessionsQueryResult>>;
      return handleAxiosError(axiosError);
    }
  },

  deleteSession: async (sessionId: string): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.delete<BackendResponse>(`/auth/sessions/${encodeURIComponent(sessionId)}`);

      return {
        success: true,
        statusCode: response.status,
      }
    } catch (error) {
      const axiosError = error as AxiosError<BackendResponse>;
      return handleAxiosError(axiosError);
    }
  },

  deleteOtherSessions: async (): Promise<ServiceResponse> => {
    try {
      const response: AxiosResponse<BackendResponse> =
        await apiClient.delete<BackendResponse>(`/auth/sessions/others`);

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