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

// request interceptors
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

// response interceptors
function registerApiUnauthorizedInterception() {
  const interceptor = apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<BackendResponse>) => {
      const isUnauthorized = error.response?.status === HttpStatusCode.Unauthorized;
      const isCsrfFailure = error.response?.status === HttpStatusCode.BadRequest &&
        error.response?.data?.error?.code === 'AntiforgeryTokenVerificationFailed';

      // reject if not unauthorized and csrf failure.
      if (!isUnauthorized && !isCsrfFailure) {
        return Promise.reject(error);
      }

      // well, unauthorized, try to invoke refresh and try request again.
      const originalRequestConfig = error.config as InternalAxiosRequestConfig & { __retry: boolean };

      // reject some endpoint
      if (originalRequestConfig.url!.includes('/auth/login') ||
        originalRequestConfig.url!.includes('/auth/register') ||
        originalRequestConfig.url!.includes('/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      // welp we retried this, fail again, bail out
      if (originalRequestConfig.__retry) {
        return Promise.reject(error);
      }

      originalRequestConfig.__retry = true;

      // make it not loop according to this:
      // https://stackoverflow.com/questions/51646853/automating-access-token-refreshing-via-interceptors-in-axios
      apiClient.interceptors.response.eject(interceptor);

      try {
        await apiClient.post("/auth/refresh");
        await csrfService.requestCsrfToken();

        return apiClient(originalRequestConfig);
      } catch (error) {
        return Promise.reject(error);
      } finally {
        registerApiUnauthorizedInterception();
      }
    }
  );
}

registerApiUnauthorizedInterception();

function registerGraphqlUnauthorizedInterception() {
  const interceptor = graphqlClient.interceptors.response.use(
    async (response) => {
      const data: any = response.data;

      const isGqlAuthError = response.status === HttpStatusCode.Ok && Array.isArray(data?.errors) &&
        (data?.errors as any[]).some(e => e.extensions?.code === 'AUTH_NOT_AUTHENTICATED');

      if (!isGqlAuthError) {
        return Promise.resolve(response);
      }

      const originalRequestConfig = response.config as InternalAxiosRequestConfig & { __retry: boolean };
      if (originalRequestConfig.__retry) {
        return Promise.reject(response);
      }

      originalRequestConfig.__retry = true;

      graphqlClient.interceptors.response.eject(interceptor);

      try {
        await apiClient.post("/auth/refresh");
        await csrfService.requestCsrfToken();

        return graphqlClient(originalRequestConfig);
      } catch (error) {
        return Promise.reject(error);
      } finally {
        registerApiUnauthorizedInterception();
      }
    },
    (error) => error
  );
}

registerGraphqlUnauthorizedInterception();

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