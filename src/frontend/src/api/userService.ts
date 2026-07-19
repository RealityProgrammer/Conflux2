import { type AxiosResponse, HttpStatusCode } from "axios";
import type { UserBasicProfileInfo } from "./responses.ts";
import { handleApiError } from "../utils/errorHelpers.ts";
import apiClient from "./client.ts";
import type { ApiResponse, BackendApiResponse } from "./apiResponse.ts";
import type {AvatarOperation} from "./requests.ts";

export const userService = {
    uploadAvatar: async (file: File): Promise<ApiResponse> => {
        try {
            const formData: FormData = new FormData();
            formData.set("File", file);

            const response: AxiosResponse<BackendApiResponse> = await apiClient.post("/user/avatar", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                }
            });

            return {
                statusCode: response.status,
            }
        } catch (err) {
            return handleApiError(err);
        }
    },

    getAvatarUrl: (userId: string, forceRefresh: boolean): string => {
        const queryParams: URLSearchParams = new URLSearchParams({
            userId: userId,
        });

        if (forceRefresh) {
            queryParams.append("t", new Date().getTime().toString());
        }

        return `${import.meta.env.VITE_BACKEND_URL}/user/avatar?${queryParams.toString()}`;
    },

    deleteAvatar: async (): Promise<ApiResponse> => {
        try {
            const response: AxiosResponse<BackendApiResponse> =
                await apiClient.delete<BackendApiResponse>("/user/avatar");

            return {
                statusCode: response.status,
            }
        } catch (err) {
            return handleApiError(err);
        }
    },

    setupProfile: async (userName: string, displayName: string, avatarOperation: AvatarOperation): Promise<ApiResponse> => {
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

            return {
                statusCode: response.status,
            };
        } catch (err) {
            return handleApiError(err);
        }
    },

    getSessionUserProfile: async (): Promise<ApiResponse<UserBasicProfileInfo>> => {
        try {
            const response: AxiosResponse<BackendApiResponse<UserBasicProfileInfo>> =
                await apiClient.get<BackendApiResponse<UserBasicProfileInfo>>("/user/profile");

            if (response.status == HttpStatusCode.Ok) {
                return {
                    statusCode: response.status,
                    message: response.data!.message,
                    data: response.data!.data,
                }
            }

            return {
                statusCode: response.status,
            }
        } catch (err) {
            return handleApiError(err);
        }
    }
}