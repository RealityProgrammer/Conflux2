import { createContext, type ReactNode, useContext } from "react";
import { useRevalidator, useNavigate, useRouteLoaderData } from "react-router-dom";
import { authService } from "../api/auth/authService.ts";
import type { UserAuthorizationInfo } from "../api/auth/responses.ts";

interface AuthorizationContextType {
    userAuthorization: UserAuthorizationInfo | null;
    logout: () => void;
}

const AuthorizationContext = createContext<AuthorizationContextType | null>(null);

export const useAuthorization = () => {
    const context = useContext(AuthorizationContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};

export default function AuthProvider({ children }: { children: ReactNode }) {
    const revalidator = useRevalidator();
    const navigate = useNavigate();

    const authorizationInfo: UserAuthorizationInfo | null = useRouteLoaderData("root") ?? null;

    const logout = async (): Promise<void> => {
        await authService.logout();

        await revalidator.revalidate();

        navigate({
            pathname: "/auth",
            hash: "login",
        });
    }

    return (
        <AuthorizationContext.Provider value={{
            userAuthorization: authorizationInfo,
            logout,
        }}>
            {children}
        </AuthorizationContext.Provider>
    )
}