import { createContext, type ReactNode, useContext, useEffect, useState, useRef } from "react";
import apiClient, { setAccessToken } from "../api/client.ts";

interface AuthContextType {
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string) => void;
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
    const [isLoading, setIsLoading] = useState(true); // Starts true to check session on boot

    const hasFired = useRef(false);

    useEffect(() => {
        // prevent duplicate execution caused by StrictMode
        if (hasFired.current) return;
        hasFired.current = true;

        // refresh access token if there is a valid refresh token
        const attemptSilentLogin = async () => {
            try {
                const { data } = await apiClient.post('http://localhost:5127/api/auth/refresh', {}, { withCredentials: true });
                setAccessToken(data.accessToken);
                setIsAuthenticated(true);
            } catch (error) {
                // No valid cookie, stay logged out
                setAccessToken(null);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false); // Done checking
            }
        };

        attemptSilentLogin();
    }, []);

    const login = (token: string) => {
        setAccessToken(token);
        setIsAuthenticated(true);
    };

    const logout = async () => {
        try {
            await apiClient.post('/auth/logout'); // Tell backend to delete cookie
        } finally {
            setAccessToken(null);
            setIsAuthenticated(false);
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}