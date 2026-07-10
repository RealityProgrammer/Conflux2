import { createContext, type ReactNode, useContext } from "react";
import { useRouteLoaderData } from "react-router-dom";

interface AuthContextType {
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
};

export default function AuthProvider({ children }: { children: ReactNode }) {
    const loaderData: { isAuthenticated: boolean } | undefined = useRouteLoaderData("root");

    return (
        <AuthContext.Provider value={{ isAuthenticated: loaderData ? loaderData.isAuthenticated : false }}>
            {children}
        </AuthContext.Provider>
    )
}