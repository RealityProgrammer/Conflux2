import {useEffect, useRef, useState} from "react";
import {HttpTransportType, HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel} from "@microsoft/signalr";

export type SignalRListener = (...args: any[]) => any;

export function useSignalRConnection(url: string): HubConnection | null {
    const [connection, setConnection] = useState<HubConnection | null>(null);

    useEffect(() => {
        // have to do this so that react strict mode double invocation doesn't cause error in the console
        let isMounted = true;

        const newConnection = new HubConnectionBuilder()
            .withUrl(url, {
                withCredentials: true,
                skipNegotiation: true,
                transport: HttpTransportType.WebSockets,
            })
            .configureLogging(LogLevel.Debug)
            .withAutomaticReconnect()
            .build();

        setConnection(newConnection);

        const startConnection = async () => {
            try {
                if (newConnection.state === HubConnectionState.Disconnected) {
                    await newConnection.start();
                }

                if (!isMounted) {
                    await newConnection.stop();
                    return;
                }
            } catch (error) {
                console.error("Failed to connect to SignalR: ", error);
            }
        };

        startConnection();

        return () => {
            isMounted = false;

            if (newConnection.state === HubConnectionState.Connected) {
                newConnection.stop();
            }
        };
    }, [url]);

    return connection;
}

export function useSignalR(url: string, listeners: Record<string, SignalRListener>): HubConnection | null {
    const connection = useSignalRConnection(url);
    const listenersRef = useRef(listeners);

    useEffect(() => {
        listenersRef.current = listeners;
    });

    useEffect(() => {
        if (!connection) return;

        const eventNames = Object.keys(listenersRef.current);

        eventNames.forEach((eventName) => {
            connection.on(eventName, (...args) => {
                listenersRef.current[eventName]?.(...args);
            });
        });

        return () => {
            eventNames.forEach((eventName) => {
                connection.off(eventName);
            });
        };
    }, [connection]);

    return connection;
}