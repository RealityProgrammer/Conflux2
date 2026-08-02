import {type AxiosError, type AxiosResponse, HttpStatusCode} from "axios";
import type {BackendResponse, GetMessagesResponse, ServiceResponse} from "./responses.ts";
import {handleAxiosError} from "./errorHandling.ts";
import apiClient from "./client.ts";
import type {GetMessagesRequest} from "./requests.ts";

export const messageService = {
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

    getMessages: async (request: GetMessagesRequest): Promise<ServiceResponse<GetMessagesResponse>> => {
        try {
            const searchParams = new URLSearchParams();

            if (request.cursor && request.direction) {
                searchParams.append("cursor", request.cursor);
                searchParams.append("direction", request.direction);
            }

            searchParams.append("count", String(request.count));

            const response: AxiosResponse<BackendResponse<GetMessagesResponse>> =
                await apiClient.get(`/channels/${encodeURIComponent(request.channelId)}/messages?${searchParams.toString()}`);

            return {
                success: true,
                statusCode: response.status,
                data: response.data.data,
            };
        } catch (error) {
            const axiosError = error as AxiosError<BackendResponse>;
            return handleAxiosError(axiosError);
        }
    },
}