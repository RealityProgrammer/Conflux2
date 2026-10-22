import {createContext, type ReactNode, useContext, useEffect, useState} from "react";
import {useNavigate, useRevalidator, useRouteLoaderData} from "react-router";
import {authService} from "../api/authService.ts";
import type {UserAuthorizationInfo, UserIdentityProfileDto} from "../api/types.ts";
import {useQueryClient} from "@tanstack/react-query";
import type {RootLoaderProps} from "../router.tsx";

interface AuthContextType {
  userAuthorization: UserAuthorizationInfo | null;
  userProfile: UserIdentityProfileDto | null;
  updateUserProfile: (updates: Partial<UserIdentityProfileDto>) => void;
  invalidateSession: () => void;
  logout: () => void;
  logoutAll: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({children}: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  // grab the data from root loader
  const loaderData = useRouteLoaderData("root") as RootLoaderProps | null;

  // put the user profile into state
  const [userProfile, setUserProfile] = useState<UserIdentityProfileDto | null>(loaderData?.userProfile ?? null);

  // keep the user profile in sync in case loader re-run
  useEffect(() => {
    setUserProfile(loaderData?.userProfile ?? null);
  }, [loaderData?.userProfile]);
  
  // update callback
  const updateUserProfile = (updates: Partial<UserIdentityProfileDto>) => {
    setUserProfile((prev: UserIdentityProfileDto | null): UserIdentityProfileDto | null => (prev ? { ...prev, ...updates } : null));
  };
  
  const invalidateSession = async (): Promise<void> => {
    await revalidator.revalidate();
    queryClient.clear();

    navigate({
      pathname: "/auth",
      hash: "login",
    });
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    await invalidateSession();
  };
  
  const logoutAll = async (): Promise<void> => {
    await authService.logoutAll();
    await invalidateSession();
  };

  return (
    <AuthContext.Provider value={{
      userAuthorization: loaderData?.authorizationInfo ?? null,
      userProfile: userProfile,
      updateUserProfile: updateUserProfile,
      logout,
      logoutAll,
      invalidateSession,
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