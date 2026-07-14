import axios, {HttpStatusCode} from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import type { UserAuthorizationInfo } from "./responses.ts";
import Cookies from "js-cookie";
let authorizationInfo: UserAuthorizationInfo | null = null;

export function hasAuthorizationInfo() {
    return !!authorizationInfo;
}

export function setAuthorizationInfo(info: UserAuthorizationInfo | null) {
    authorizationInfo = info;
}

export function getAuthorizationInfo() {
    return authorizationInfo;
}

axios.defaults.withCredentials = true;

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (error: any) => void }> = [];

function processQueue(error: any) {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve();
        }
    });

    failedQueue = [];
};

// request interceptors
apiClient.interceptors.request.use((config) => {
    // Only attach for state-changing methods
    if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase() || '')) {
        const csrfToken = Cookies.get('XSRF-TOKEN');
        if (csrfToken) {
            config.headers['X-XSRF-TOKEN'] = csrfToken;
        }
    }
    return config;
});

// response interceptors
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { __retry: boolean };

        if (error.response?.status === HttpStatusCode.Unauthorized &&
            originalRequest && !(originalRequest as any).__retry &&
            originalRequest.url !== "/api/auth/login" &&
            originalRequest.url !== "/api/auth/register"
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    // @ts-ignore
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    return apiClient(originalRequest);
                })
                .catch((err) => Promise.reject(err));
            }

            (originalRequest as any).__retry = true;
            isRefreshing = true;

            try {
                await axios.post(`${import.meta.env.VITE_BACKEND_URL}/auth/refresh`, {}, {
                    withCredentials: true
                });

                processQueue(null);
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                authorizationInfo = null;

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;