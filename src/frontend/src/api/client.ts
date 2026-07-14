import axios, {HttpStatusCode} from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import Cookies from "js-cookie";

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

        const isAuthRequest: boolean =
            originalRequest.url!.includes('/auth/login') ||
            originalRequest.url!.includes('/auth/register') ||
            originalRequest.url!.includes('/auth/refresh');

        if (error.response?.status === HttpStatusCode.Unauthorized && originalRequest && !originalRequest.__retry && !isAuthRequest) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    // @ts-ignore
                    failedQueue.push({ resolve, reject });
                }).then(() => {
                    return apiClient(originalRequest);
                })
                .catch((err) => Promise.reject(err));
            }

            originalRequest.__retry = true;
            isRefreshing = true;

            try {
                await axios.post(`${import.meta.env.VITE_BACKEND_URL}/auth/refresh`, {}, {
                    withCredentials: true
                });

                processQueue(null);
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;