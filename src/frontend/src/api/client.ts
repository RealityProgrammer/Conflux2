import axios, { HttpStatusCode } from 'axios';
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
        async (error: AxiosError) => {
            // if error happen, check if it is caused by unauthorized error, if not, reject
            if (error.response?.status !== HttpStatusCode.Unauthorized) {
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
            axios.interceptors.response.eject(interceptor);

            try {
                await axios.post(`${import.meta.env.VITE_BACKEND_URL}/auth/refresh`, {}, {
                    withCredentials: true
                });

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

export default apiClient;