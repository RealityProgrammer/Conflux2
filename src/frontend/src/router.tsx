import {createBrowserRouter, Outlet, redirect} from 'react-router-dom';
import HomePage from './pages/HomePage'
import AuthenticatePage, {authAction} from "./pages/auth/AuthenticatePage.tsx";
import LobbyPage from "./pages/lobby/LobbyPage.tsx";
import AuthProvider from "./contexts/AuthContext.tsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.tsx";
import apiClient from "./api/client.ts";
import {authService} from "./api/authService.ts";
import {HttpStatusCode} from "axios";
import type {UserAuthorizationInfo} from "./api/responses.ts";

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
                loader: async () => {
                    const response = await authService.getAuthorizationInfo();

                    if (response.statusCode !== HttpStatusCode.Ok || !response.data) {
                        return redirect('/auth#login');
                    }

                    const authorizationInfo: UserAuthorizationInfo = response.data;

                    if (!authorizationInfo.permissions.includes("EMAIL_VERIFIED")) {
                        console.log("lobbyloader: to verify-email.");
                        return redirect("/auth/verify-email");
                    }

                    console.log("lobbyloader: finish.");
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
    const [authResponse] = await Promise.all([
        authService.getAuthorizationInfo(),
        apiClient.get("/csrf/token").catch(() => null) // Suppress fails so app loads even if backend is offline
    ]);

    return authResponse.data;
}