import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from "axios";

let inMemoryAccessToken: string | null = null;

function setAccessToken(accessToken: string | null): void {
    inMemoryAccessToken = accessToken;
}

const apiClient = axios.create({
    baseURL: 'http://localhost:5127/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

function processQueue(error: any, token: string | null = null) {
    failedQueue.forEach((promise) => {
        if (error) {
            promise.reject(error);
        } else {
            promise.resolve(token as string);
        }
    });

    failedQueue = [];
};

// intercept the request to attach the access token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (inMemoryAccessToken && config.headers) {
            config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && originalRequest && !(originalRequest as any).__retry && originalRequest.url !== '/auth') {
            if (isRefreshing) {
                return new Promise(function (resolve, reject) {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return apiClient(originalRequest);
                })
                .catch((err) => Promise.reject(err));
            }

            (originalRequest as any).__retry = true;
            isRefreshing = true;

            try {
                const { data } = await axios.post('https://localhost:5001/api/auth/refresh', {}, {
                    withCredentials: true
                });

                setAccessToken(data.accessToken);
                processQueue(null, data.accessToken);

                originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);
                setAccessToken(null); // Clear token

                // Trigger your app's logout flow here (e.g., redirect to /login)
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
)

export default apiClient;