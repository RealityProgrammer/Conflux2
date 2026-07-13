import { createBrowserRouter, Outlet } from 'react-router-dom';
import HomePage from './pages/HomePage'
import AuthenticatePage, {authAction} from "./pages/auth/AuthenticatePage.tsx";
import LobbyPage from "./pages/lobby/LobbyPage.tsx";
import AuthProvider from "./contexts/AuthContext.tsx";
import {protectedLoader, rootLoader} from "./miscs/loaders.tsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.tsx";

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
                action: authAction,
                children: [
                    {
                        index: true,
                        element: <AuthenticatePage/>,
                    },
                    {
                        path: "verify-email",
                        element: <VerifyEmailPage/>,
                    },
                ]
            },
            {
                path: "lobby",
                element: <LobbyPage/>,
                loader: protectedLoader,
            }
        ]
    }
]);