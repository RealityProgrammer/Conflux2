import type {AxiosError, AxiosResponse, InternalAxiosRequestConfig} from "axios";
import axios, {HttpStatusCode} from "axios";
import Cookies from "js-cookie";
import {csrfService} from "./csrfService.ts";
import type {BackendResponse} from "./types.ts";
import type {GraphQLResponse} from "./hotChocolate.ts";

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

// request intercepting to attach the CSRF token into the header
apiClient.interceptors.request.use((config) => {
  // Only attach for state-changing methods
  if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
    const csrfToken = Cookies.get('XSRF-TOKEN');
    if (csrfToken) {
      config.headers['X-CSRF-TOKEN'] = csrfToken;
    }
  }
  return config;
});

// refresh queue logic
let refreshPromise: Promise<void> | null = null;

const executeRefresh = async () => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        await apiClient.post("/auth/refresh");
        await csrfService.requestCsrfToken();
      } finally {
        // clear the promise once done so future 401s can trigger a new refresh
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
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

    const originalRequestConfig = error.config as InternalAxiosRequestConfig & { __retry?: boolean };

    if (
      originalRequestConfig.url!.includes('/auth/login') ||
      originalRequestConfig.url!.includes('/auth/register') ||
      originalRequestConfig.url!.includes('/auth/refresh')
    ) {
      return Promise.reject(error);
    }

    if (originalRequestConfig.__retry) {
      return Promise.reject(error);
    }

    originalRequestConfig.__retry = true;

    try {
      // wait for the ongoing refresh (or start a new one)
      await executeRefresh();

      // retry the original request
      return apiClient(originalRequestConfig);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
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
      return Promise.resolve(response);
    }

    const originalRequestConfig = response.config as InternalAxiosRequestConfig & { __retry?: boolean };

    if (originalRequestConfig.__retry) {
      // return a rejected promise with the errors so the fetcher throws
      return Promise.reject(data.errors);
    }

    originalRequestConfig.__retry = true;

    try {
      // wait for the ongoing refresh (or start a new one)
      await executeRefresh();

      // retry the original request
      return graphqlClient(originalRequestConfig);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
  (error) => error // let network errors pass through or handle them identically
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