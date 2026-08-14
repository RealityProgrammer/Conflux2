import type {AxiosError, InternalAxiosRequestConfig} from "axios";
import axios, {HttpStatusCode} from "axios";
import Cookies from "js-cookie";
import {csrfService} from "./csrfService.ts";
import type {BackendResponse} from "./responses.ts";
import type {TypedDocumentNode} from "@graphql-typed-document-node/core";
import {print} from 'graphql';

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
function registerAuthenticateExpirationInterception() {
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
        registerAuthenticateExpirationInterception();
      }
    }
  );
}

registerAuthenticateExpirationInterception();

export async function executeGraphQL<TData, TVariables>(
  document: TypedDocumentNode<TData, TVariables>,
  variables?: TVariables
): Promise<TData> {

  // Convert the AST object back into a string for the HTTP request
  const query = print(document);

  const response = await graphqlClient.post('', {
    query,
    variables,
  });

  if (response.data.errors?.length > 0) {
    throw new Error(`GraphQL Error:\n${response.data.errors.map((e: any) => e.message).join('\n')}`);
  }

  return response.data.data;
}