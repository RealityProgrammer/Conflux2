import {type AxiosResponse, HttpStatusCode} from "axios";
import type {UserBasicProfileInfo, UploadAvatarResponse} from "./responses.ts";
import { handleApiError } from "../utils/errorHelpers.ts";
import apiClient from "./client.ts";
import type { ApiResponse } from "./apiResponse.ts";

export const userService = {
    uploadAvatar: async (file: File): Promise<ApiResponse<UploadAvatarResponse>> => {
        try {
            const formData: FormData = new FormData();
            formData.set("File", file);

            const response: AxiosResponse<UploadAvatarResponse> =
                await apiClient.post("/user/avatar", formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    }
                });
            return {
                statusCode: response.status,
                data: response.data,
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
            const response: AxiosResponse = await apiClient.delete("/user/avatar");

            return {
                statusCode: response.status,
            }
        } catch (err) {
            return handleApiError(err);
        }
    },

    getSessionUserProfile: async (): Promise<ApiResponse<UserBasicProfileInfo>> => {
        try {
            const response: AxiosResponse<{ profile: UserBasicProfileInfo | null, message: string | null } | null> =
                await apiClient.get("/user/profile");

            if (response.status == HttpStatusCode.Ok) {
                return {
                    statusCode: response.status,
                    message: response.data!.message,
                    data: response.data!.profile,
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