import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import type {BackendResponse, ServiceResponse} from "./responses.ts";
import {handleAxiosError} from "./errorHandling.ts";
import apiClient from "./client.ts";

export const messagingService = {
    sendMessage: async (channelId: string, body?: string, attachments?: File[]): Promise<ServiceResponse> => {
        const trimmedBody = body?.trim();

        if (!trimmedBody && !attachments) {
            return {
                success: false,
                statusCode: HttpStatusCode.BadRequest,
            };
        }

        // TODO: Client-side validate the attachments
        try {
            const formData = new FormData();

            if (trimmedBody) {
                formData.append("body", trimmedBody);
            }

            if (attachments) {
                for (let i = 0; i < attachments.length; i++) {
                    formData.append("fileToUpload[]", attachments[i]);
                }
            }

            const response: AxiosResponse<BackendResponse> =
                await apiClient.post(`/channels/${encodeURIComponent(channelId)}/messages`, formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    }
                });

            return {
                success: true,
                statusCode: response.status,
            };
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },
}