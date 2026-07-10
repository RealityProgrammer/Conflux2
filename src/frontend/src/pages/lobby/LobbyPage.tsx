import { useAuth } from "../../contexts/AuthContext.tsx";
import {authService} from "../../api/authService.ts";

export default function LobbyPage() {
    const authData = useAuth();

    return (
        <>
            { authData.isAuthenticated ? <p>You are authenticated.</p> : <p>You are not authenticated.</p> }

            <button onClick={authService.logout}>Logout</button>
        </>
    );
}