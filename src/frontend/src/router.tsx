import {createBrowserRouter, Outlet, redirect} from 'react-router-dom';
import HomePage from './pages/HomePage'
import AuthenticatePage, {authAction} from "./pages/auth/AuthenticatePage.tsx";
import LobbyPage from "./pages/lobby/LobbyPage.tsx";
import AuthProvider from "./contexts/AuthContext.tsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.tsx";
import apiClient, {getAuthorizationInfo, hasAuthorizationInfo, setAuthorizationInfo} from "./api/client.ts";
import {authService} from "./api/authService.ts";
import {HttpStatusCode} from "axios";

export const router = createBrowserRouter([
    {
        id: "root",
        path: "/",
        loader: rootLoader,
        element: (
            <AuthProvider>
                <Outlet/>
            </AuthProvider>
        ),
        children: [
            {
                index: true,
                element: <HomePage/>,
            },
            {
                path: "auth",
                children: [
                    {
                        index: true,
                        element: <AuthenticatePage/>,
                        action: authAction,
                    },
                    {
                        path: "verify-email",
                        element: <VerifyEmailPage/>,
                    },
                ]
            },
            {
                id: "lobby",
                path: "lobby",
                loader: () => {
                    if (!hasAuthorizationInfo()) {
                        return redirect('/auth#login');
                    }

                    const authorizationInfo = getAuthorizationInfo();

                    if (!authorizationInfo?.permissions.includes("EMAIL_VERIFIED")) {
                        return redirect("/auth/verify-email");
                    }

                    return null;
                },
                element: <Outlet/>,
                children: [
                    {
                        index: true,
                        element: <LobbyPage/>,
                    }
                ]
            }
        ]
    }
]);

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