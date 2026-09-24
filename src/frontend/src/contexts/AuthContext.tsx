import {createContext, type ReactNode, useContext, useEffect, useState} from "react";
import {useNavigate, useRevalidator, useRouteLoaderData} from "react-router";
import {authService} from "../api/authService.ts";
import type {UserAuthorizationInfo, UserIdentityProfileDto} from "../api/types.ts";

interface AuthContextType {
  userAuthorization: UserAuthorizationInfo | null;
  userProfile: UserIdentityProfileDto | null;
  updateUserProfile: (updates: Partial<UserIdentityProfileDto>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({children}: { children: ReactNode }) {
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
      return {...prev, ...updates};
    });
  };

  useEffect(() => {
    setUserProfile(loaderData?.userProfile ?? null);
  }, [loaderData?.userProfile]);

  const logout = async (): Promise<void> => {
    await authService.logout();

    await revalidator.revalidate();

    navigate({
      pathname: "/auth",
      hash: "login",
    });
  }

  return (
    <AuthContext.Provider value={{
      userAuthorization: authorizationInfo,
      userProfile: userProfile,
      updateUserProfile: updateUserProfile,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider.");

  return context;
}