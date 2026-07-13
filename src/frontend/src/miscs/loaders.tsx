import apiClient, {getAuthorizationInfo, hasAuthorizationInfo, setAuthorizationInfo} from "../api/client.ts";
import { redirect } from "react-router-dom";
import { HttpStatusCode } from "axios";
import { authService } from "../api/authService.ts";

export async function rootLoader() {
    if (!hasAuthorizationInfo()) {
        try {
            const response = await authService.getAuthorizationInfo();

            if (response.statusCode === HttpStatusCode.Ok) {
                setAuthorizationInfo(response.data!);
            }

            await apiClient.get("/csrf/token");

            return response.data;
        } catch (error) {
            setAuthorizationInfo(null);
            return null;
        }
    }

    return getAuthorizationInfo();
}

export async function protectedLoader() {
    if (!hasAuthorizationInfo()) {
        return redirect('/auth#login');
    }

    return null;
}