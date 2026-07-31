import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import type {BackendResponse, ServiceResponse, UserBasicProfileSummary} from "./responses.ts";
import apiClient from "./client.ts";
import type { AvatarOperation } from "./requests.ts";
import { handleAxiosError } from "./errorHandling.ts";
import {authService} from "./authService.ts";

export const userService = {
    uploadAvatar: async (file: File): Promise<ServiceResponse> => {
        try {
            const formData: FormData = new FormData();
            formData.set("File", file);

            const response: AxiosResponse<BackendResponse> = await apiClient.post("/user/avatar", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                }
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

    getAvatarUrl: (userId: string, forceRefresh: boolean): string => {
        const queryParams: URLSearchParams = new URLSearchParams({
            userId: userId,
        });

        if (forceRefresh) {
            queryParams.append("t", new Date().getTime().toString());
        }

        return `${import.meta.env.VITE_BACKEND_API_URL}/user/avatar?${queryParams.toString()}`;
    },

    deleteAvatar: async (): Promise<ServiceResponse> => {
        try {
            const response: AxiosResponse<BackendResponse> =
                await apiClient.delete<BackendResponse>("/user/avatar");

            return {
                success: true,
                statusCode: response.status,
            }
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },

    setupProfile: async (userName: string,
                         displayName: string,
                         avatarOperation: AvatarOperation): Promise<ServiceResponse> => {
        try {
            const formData = new FormData();
            formData.append("userName", userName);
            formData.append("displayName", displayName);
            formData.append("avatarOperation", avatarOperation.type);

            if (avatarOperation.type === "set") {
                formData.append("avatarFile", avatarOperation.file);
            }

            const response = await apiClient.post("/user/setup-profile", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                }
            });

            if (response.status === HttpStatusCode.Ok) {
                // refresh the authorization information to refresh the profile setup claim.
                await authService.refresh();
            }

            return {
                success: true,
                statusCode: response.status,
            };
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },

    getUserBasicProfile: async (userId: string): Promise<ServiceResponse<UserBasicProfileSummary>> => {
        try {
            const response: AxiosResponse<BackendResponse<UserBasicProfileSummary>> =
                await apiClient.get<BackendResponse<UserBasicProfileSummary>>(`/user/${encodeURIComponent(userId)}/profile`);

            return {
                success: true,
                statusCode: response.status,
                data: response.data!.data,
            }
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },

    getSessionUserBasicProfile: async (): Promise<ServiceResponse<UserBasicProfileSummary>> => {
        try {
            const response: AxiosResponse<BackendResponse<UserBasicProfileSummary>> =
                await apiClient.get<BackendResponse<UserBasicProfileSummary>>("/user/profile");

            return {
                success: true,
                statusCode: response.status,
                data: response.data!.data,
            }
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },
}