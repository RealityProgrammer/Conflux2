import { createContext, type ReactNode, useContext } from "react";
import { useRouteLoaderData, useRevalidator, useNavigate } from "react-router-dom";
import { authService } from "../api/authService.ts";

interface AuthContextType {
    isAuthenticated: boolean;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};

export default function AuthProvider({ children }: { children: ReactNode }) {
    const loaderData: { isAuthenticated: boolean } | undefined = useRouteLoaderData("root");
    const revalidator = useRevalidator();
    const navigate = useNavigate();

    const logout = async (): Promise<void> => {
        // logout will automatically set the accessToken to null
        await authService.logout();

        await revalidator.revalidate();
        navigate({
            pathname: "/auth",
            hash: "login",
        });
    }

    return (
        <AuthContext.Provider value={{
            isAuthenticated: loaderData ? loaderData.isAuthenticated : false,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    )
}