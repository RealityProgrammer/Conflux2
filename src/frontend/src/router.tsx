import { createBrowserRouter, Outlet } from 'react-router-dom';
import HomePage from './pages/HomePage'
import AuthenticatePage, {authAction} from "./pages/auth/AuthenticatePage.tsx";
import LobbyPage from "./pages/lobby/LobbyPage.tsx";
import AuthProvider from "./contexts/AuthContext.tsx";
import {protectedLoader, rootLoader} from "./miscs/loaders.tsx";

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
                path: "/auth",
                element: <AuthenticatePage/>,
                action: authAction,
            },
            {
                path: "/"
            },
            {
                path: "/lobby",
                element: <LobbyPage/>,
                loader: protectedLoader,
            }
        ]
    }
]);