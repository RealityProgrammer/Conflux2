import {createBrowserRouter, Outlet} from 'react-router-dom';
import HomePage from './pages/HomePage'
import AuthenticatePage, { authAction, authLoader } from "./pages/auth/AuthenticatePage.tsx";
import LobbyPage from "./pages/lobby/LobbyPage.tsx";
import {protectedLoader, rootLoader} from "./miscs/loaders.tsx";
import AuthProvider from "./contexts/AuthContext.tsx";

export const router = createBrowserRouter([
    {
        id: "root",
        path: "/",
        loader: rootLoader, // root loader that handle the silent login via refresh token
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
                loader: authLoader,
                action: authAction,
            },
            {
                path: "/lobby",
                element: <LobbyPage/>,
                loader: protectedLoader,
            }
        ]
    }
]);