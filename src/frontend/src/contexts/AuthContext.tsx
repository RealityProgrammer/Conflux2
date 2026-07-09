import { createContext, type ReactNode, useContext, useEffect, useState, useRef } from "react";
import { authService } from "../api/authService.ts";
import type {ApiResponse, RefreshResponse} from "../api/types/responses.ts";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};

export default function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // start true because we are loading, obviously

    const hasFired = useRef(false);

    useEffect(() => {
        // prevent duplicate execution caused by StrictMode
        if (hasFired.current) return;
        hasFired.current = true;

        // refresh access token if there is a valid refresh token
        const attemptSilentLogin = async () => {
            const response: ApiResponse<RefreshResponse> = await authService.refresh();

            setIsAuthenticated(response.statusCode === 200);
            setIsLoading(false);
        };

        attemptSilentLogin();
    }, []);

    const logout = async () => {
        await authService.logout();
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}