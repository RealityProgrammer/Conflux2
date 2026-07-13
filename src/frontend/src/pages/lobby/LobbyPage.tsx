import { useAuthorization } from "../../contexts/AuthContext.tsx";

export default function LobbyPage() {
    const authData = useAuthorization();

    return (
        <>
            { authData.userAuthorization ? <p>You are authenticated.</p> : <p>You are not authenticated.</p> }

            <button onClick={authData.logout}>Logout</button>
        </>
    );
}