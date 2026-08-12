import {createContext, type ReactNode, useContext, useEffect, useState} from "react";
import {
    HttpTransportType,
    type HubConnection,
    HubConnectionBuilder,
    HubConnectionState,
    LogLevel
} from "@microsoft/signalr";
import { apiClient } from "../api/client.ts";

interface SignalRContextType {
    connection: HubConnection | null;
    isConnected: boolean;
}

const SignalRConnectionContext = createContext<SignalRContextType | null>(null);

export const useSignalRConnection = (): SignalRContextType => {
    const context = useContext(SignalRConnectionContext);
    if (!context) throw new Error("useSignalRConnection must be used within an SignalRConnectionProvider.");
    return context;
};

export default function SignalRConnectionProvider({ children }: { children: ReactNode }) {
    const [connection, setConnection] = useState<HubConnection | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // have to do this so that react strict mode double invocation doesn't cause error in the console
        let isMounted = true;
        let startPromise: Promise<void> | null = null;

        const newConnection = new HubConnectionBuilder()
            .withUrl(`${import.meta.env.VITE_BACKEND_URL}/hub`, {
                withCredentials: true,
                transport: HttpTransportType.WebSockets,
            })
            .configureLogging(LogLevel.Debug)
            .withAutomaticReconnect()
            .build();

        newConnection.onreconnecting(() => setIsConnected(false));
        newConnection.onreconnected((connectionId) => {
            setIsConnected(true);

            if (connectionId) {
                apiClient.defaults.headers.common['X-SignalR-Connection-Id'] = connectionId;
            }
        });
        newConnection.onclose(() => {
            setIsConnected(false);
            delete apiClient.defaults.headers.common['X-SignalR-Connection-Id'];
        });

        if (newConnection.state === HubConnectionState.Disconnected) {
            startPromise = newConnection.start().then(() => {
                if (isMounted) {
                    setConnection(newConnection);
                    setIsConnected(true);

                    if (newConnection.connectionId) {
                        apiClient.defaults.headers.common['X-SignalR-Connection-Id'] = newConnection.connectionId;
                    }
                }
            }).catch((err) => {
                console.error("Failed to connect to SignalR: ", err);
            });
        }

        return () => {
            isMounted = false;
            setIsConnected(false);

            delete apiClient.defaults.headers.common['X-SignalR-Connection-Id'];

            if (startPromise) {
                startPromise.then(() => {
                    if (newConnection.state !== HubConnectionState.Disconnected) {
                        newConnection.stop();
                    }
                });
            } else if (newConnection.state !== HubConnectionState.Disconnected) {
                newConnection.stop();
            }
        };
    }, []);

    return (
        <SignalRConnectionContext.Provider value={{ connection, isConnected }}>
            {children}
        </SignalRConnectionContext.Provider>
    );
}