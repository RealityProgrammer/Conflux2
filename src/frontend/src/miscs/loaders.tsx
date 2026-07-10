import { hasAccessToken } from "../api/client.ts";
import { redirect } from "react-router-dom";
import { HttpStatusCode } from "axios";
import { authService } from "../api/authService.ts";

export async function rootLoader() {
    if (!hasAccessToken()) {
        try {
            const response = await authService.refresh();
            return { isAuthenticated: response.statusCode === HttpStatusCode.Ok };
        } catch (error) {
            return { isAuthenticated: false };
        }
    }

    return { isAuthenticated: true };
}

export async function protectedLoader() {
    // check if user has access token stored.
    if (!hasAccessToken()) {
        // try refresh the token
        try {
            const response = await authService.refresh();
            if (response.statusCode !== HttpStatusCode.Ok) {
                return redirect('/auth');
            }

            // token is automatically set by calling authService.refresh()
        } catch (error) {
            return redirect('/auth');
        }
    }

    // we got access token, so let them pass through.
    return { isAuthenticated: true };
}