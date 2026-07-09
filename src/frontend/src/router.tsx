import { createBrowserRouter } from 'react-router-dom';
import HomePage from './pages/HomePage'
import AuthenticatePage from "./pages/auth/AuthenticatePage.tsx";
import LobbyPage from "./pages/lobby/LobbyPage.tsx";

export const router = createBrowserRouter([
    {
        path: '/',
        element: <HomePage/>,
    },
    {
        path: '/auth',
        element: <AuthenticatePage/>
    },
    {
        path: '/lobby',
        element: <LobbyPage/>
    },
]);