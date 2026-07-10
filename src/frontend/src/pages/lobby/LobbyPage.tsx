import { useAuth } from "../../contexts/AuthContext.tsx";

export default function LobbyPage() {
    const authData = useAuth();

    return (
        <>
            { authData.isAuthenticated ? <p>You are authenticated.</p> : <p>You are not authenticated.</p> }

            <button onClick={authData.logout}>Logout</button>
        </>
    );
}