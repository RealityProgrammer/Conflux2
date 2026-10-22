import type {AxiosError, AxiosResponse, InternalAxiosRequestConfig} from "axios";
import axios, {HttpStatusCode} from "axios";
import Cookies from "js-cookie";
import {csrfService} from "./csrfService.ts";
import type {BackendResponse} from "./types.ts";
import type {GraphQLResponse} from "./hotChocolate.ts";
import {useAuthStore} from "../store/useAuthStore.ts";

axios.defaults.withCredentials = true;

export const apiClient = axios.create({
  baseURL: '/api/',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const graphqlClient = apiClient.create({
  baseURL: `/graphql`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

const attachCsrfToken = (config: InternalAxiosRequestConfig) => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
    const csrfToken = Cookies.get('XSRF-TOKEN');
    if (csrfToken) {
      config.headers['X-CSRF-TOKEN'] = csrfToken;
    }
  }
  return config;
};

apiClient.interceptors.request.use(attachCsrfToken);
graphqlClient.interceptors.request.use(attachCsrfToken);

// refresh queue logic
let refreshPromise: Promise<void> | null = null;

const executeRefresh = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        await apiClient.post("/auth/refresh");
        await csrfService.requestCsrfToken();
      } catch (refreshError) {
        // if refresh fails, wipe frontend auth state immediately
        useAuthStore.getState().clearSession();
        
        try {
          await csrfService.requestCsrfToken();
        } catch (csrfErr) {
          console.error("Failed to reset to anonymous CSRF token", csrfErr);
        }
        
        throw refreshError;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
};

const handleUnauthorizedRetry = async (
  originalRequestConfig: InternalAxiosRequestConfig & { __retry?: boolean },
  clientInstance: typeof apiClient
) => {
  if (
    originalRequestConfig.url!.includes('/auth/login') ||
    originalRequestConfig.url!.includes('/auth/register') ||
    originalRequestConfig.url!.includes('/auth/refresh')
  ) {
    return Promise.reject(originalRequestConfig);
  }

  if (originalRequestConfig.__retry) {
    return Promise.reject(originalRequestConfig);
  }

  originalRequestConfig.__retry = true;

  try {
    await executeRefresh();
    return clientInstance(originalRequestConfig);
  } catch (refreshError) {
    return Promise.reject(refreshError);
  }
};

// api interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<BackendResponse>) => {
    const isUnauthorized = error.response?.status === HttpStatusCode.Unauthorized;
    const isCsrfFailure = error.response?.status === HttpStatusCode.BadRequest &&
      error.response?.data?.error?.code === 'AntiforgeryTokenVerificationFailed';

    if (!isUnauthorized && !isCsrfFailure) {
      return Promise.reject(error);
    }

    return handleUnauthorizedRetry(error.config as any, apiClient);
  }
);

// graphql interceptor
graphqlClient.interceptors.response.use(
  async (response) => {
    const data: any = response.data;
    const isGqlAuthError = response.status === HttpStatusCode.Ok &&
      Array.isArray(data?.errors) &&
      ((data?.errors as any[]) ?? []).some(e => e.extensions?.code === 'AUTH_NOT_AUTHENTICATED');

    if (!isGqlAuthError) {
      return response;
    }

    return handleUnauthorizedRetry(response.config as any, graphqlClient);
  },
  async (error: AxiosError) => {
    if (error.response?.status === HttpStatusCode.Unauthorized) {
      return handleUnauthorizedRetry(error.config as any, graphqlClient);
    }
    
    return Promise.reject(error);
  }
);

export const graphqlFetcher = <TData, TVariables>(
  query: string | { toString: () => string },
  variables?: TVariables,
  options?: any
): (() => Promise<TData>) => {
  return async (): Promise<TData> => {
    const response: AxiosResponse<GraphQLResponse<TData>> = await graphqlClient.post(
      '',
      {
        query: query.toString(),
        variables,
      },
      options
    );

    if (response.data.errors && response.data.errors.length > 0) {
      throw response.data.errors;
    }

    return response.data.data!;
  };
};