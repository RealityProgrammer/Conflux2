import { createContext, type ReactNode, useContext, useState, useEffect } from "react";
import { useRevalidator, useNavigate, useRouteLoaderData } from "react-router-dom";
import { authService } from "../api/authService.ts";
import { userService } from "../api/userService.ts";
import type { UserBasicProfileInfo, UserAuthorizationInfo } from "../api/responses.ts";

interface AuthorizationContextType {
    userAuthorization: UserAuthorizationInfo | null;
    userProfile: UserBasicProfileInfo | null;
    updateUserProfile: (updates: Partial<UserBasicProfileInfo>) => void;
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
    const [userProfile, setUserProfile] = useState<UserBasicProfileInfo | null>(null);

    // if authorization id got changed for some reason, fetch the new profile of the new user.
    // SESSION TOKEN SHOULD BE CHANGED TOO BECAUSE getSessionUserProfile DEPENDS ON THE "sub" CLAIM.
    useEffect(() => {
        if (authorizationInfo?.id && !userProfile) {
            userService.getSessionUserProfile().then(response => {
                setUserProfile(response.data ?? null);
            }).catch((error) => {
                console.error("Failed to load user profile: ", error);
            });
        }
    }, [authorizationInfo?.id]);

    const updateUserProfile = (updates: Partial<UserBasicProfileInfo>) => {
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
    )
}