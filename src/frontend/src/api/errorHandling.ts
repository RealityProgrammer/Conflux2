import type {AxiosError, HttpStatusCode} from "axios";
import type {BackendResponse, ServiceResponse} from "./responses.ts";

export function handleAxiosError(error: AxiosError<BackendResponse>): ServiceResponse {
  if (error.response) {
    return {
      success: false,
      statusCode: error.response.status,
      error: error.response.data?.error || {
        code: "UNKNOWN_SERVER_ERROR",
        message: "An unknown server error occurred.",
      },
    }
  } else if (error.request) {
    return {
      success: false,
      statusCode: 0 as HttpStatusCode,
      error: {
        code: "NETWORK_ERROR",
        message: "No response received from the server.",
        details: error.message,
      },
    };
  } else {
    return {
      success: false,
      statusCode: 0 as HttpStatusCode,
      error: {
        code: "REQUEST_SETUP_ERROR",
        message: "Failed to setup the request.",
        details: error.message,
      },
    };
  }
}