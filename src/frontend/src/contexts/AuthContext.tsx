import { createContext, type ReactNode, useContext, useState } from "react";
import { useRevalidator, useNavigate, useRouteLoaderData } from "react-router";
import { authService } from "../api/authService.ts";
import type { UserIdentityProfileDto, UserAuthorizationInfo } from "../api/responses.ts";

interface AuthorizationContextType {
    userAuthorization: UserAuthorizationInfo | null;
    userProfile: UserIdentityProfileDto | null;
    updateUserProfile: (updates: Partial<UserIdentityProfileDto>) => void;
    logout: () => void;
}

const AuthorizationContext = createContext<AuthorizationContextType | null>(null);

export const useAuthorization = () => {
    const context = useContext(AuthorizationContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider.");
    return context;
};

export default function AuthProvider({ children }: { children: ReactNode }) {
    const revalidator = useRevalidator();
    const navigate = useNavigate();

    const loaderData = useRouteLoaderData("root") as {
        authorizationInfo: UserAuthorizationInfo | null,
        userProfile: UserIdentityProfileDto | null
    } | null;

    const authorizationInfo: UserAuthorizationInfo | null = loaderData?.authorizationInfo ?? null;
    const [userProfile, setUserProfile] = useState<UserIdentityProfileDto | null>(loaderData?.userProfile ?? null);

    const updateUserProfile = (updates: Partial<UserIdentityProfileDto>) => {
        setUserProfile(prev => {
            if (!prev) return null;
            return { ...prev, ...updates };
        });
    };

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
            userProfile: userProfile,
            updateUserProfile: updateUserProfile,
            logout,
        }}>
            {children}
        </AuthorizationContext.Provider>
    );
}