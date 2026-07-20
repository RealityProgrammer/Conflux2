import { useAuthorization } from "../../contexts/AuthContext.tsx";
import apiClient from "../../api/client.ts";
import type {AxiosError, AxiosResponse} from "axios";

export default function LobbyPage() {
    const authData = useAuthorization();

    return (
        <>
            { authData.userAuthorization ? <p>You are authenticated.</p> : <p>You are not authenticated.</p> }

            <button onClick={authData.logout}>Logout</button>
            <button onClick={() => {
                apiClient.post("/csrf/test").then(response => {
                    console.log("csrf successful");
                }).catch(error => {
                    console.error("csrf error");
                });
            }}>Test CSRF</button>
        </>
    );
}