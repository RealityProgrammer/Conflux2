import { createBrowserRouter, Outlet, redirect } from 'react-router-dom';
import HomePage from './pages/HomePage'
import AuthenticatePage, { authAction } from "./pages/auth/AuthenticatePage.tsx";
import LobbyPage from "./pages/lobby/LobbyPage.tsx";
import AuthProvider from "./contexts/AuthContext.tsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.tsx";
import apiClient from "./api/client.ts";
import { authService } from "./api/authService.ts";
import { HttpStatusCode } from "axios";
import type { UserAuthorizationInfo } from "./api/responses.ts";
import ConfirmEmailPage from "./pages/auth/ConfirmEmailPage.tsx";
import ProfileSetupPage from "./pages/miscs/ProfileSetupPage.tsx";

export const router = createBrowserRouter([
    {
        id: "root",
        path: "/",
        loader: async () => {
            const [authResponse] = await Promise.all([
                authService.getAuthorizationInfo(),
                // suppress fails so app loads even if backend is offline
                apiClient.get("/csrf/token").catch(() => null)
            ]);

            return authResponse.data;
        },
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
                        loader: async () => {
                            const response = await authService.getAuthorizationInfo();

                            if (response.statusCode === HttpStatusCode.Ok && response.data) {
                                return redirect('/lobby');
                            }

                            return null;
                        },
                    },
                    {
                        path: "verify-email",
                        element: <VerifyEmailPage/>,
                        loader: restrictConfirmedUser,
                    },
                    {
                        path: "confirm-email",
                        element: <ConfirmEmailPage/>,
                        loader: restrictConfirmedUser,
                    }
                ]
            },
            {
                path: "setup-profile",
                loader: async () => {
                    const response = await authService.getAuthorizationInfo();

                    if (response.statusCode !== HttpStatusCode.Ok || !response.data) {
                        return redirect('/auth#login');
                    }

                    return response.data.isProfileSetup ? redirect('/') : null;
                },
                element: <ProfileSetupPage/>
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

                    if (!authorizationInfo.isVerified) {
                        return redirect("/auth/verify-email");
                    }

                    if (!authorizationInfo.isProfileSetup) {
                        return redirect("/setup-profile");
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

async function restrictConfirmedUser() {
    const response = await authService.getAuthorizationInfo();

    if (response.statusCode === HttpStatusCode.Ok && response.data && response.data.isVerified) {
        return redirect('/');
    }

    return null;
}