import type { AxiosResponse } from "axios";
import type { UploadAvatarResponse } from "./responses.ts";
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
}