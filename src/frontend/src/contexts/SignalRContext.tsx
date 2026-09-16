import {createContext, type ReactNode, useContext, useEffect, useRef, useState} from "react";
import {
  HttpTransportType,
  type HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel
} from "@microsoft/signalr";
import {apiClient, graphqlClient} from "../api/client.ts";

export type SignalRContextType = {
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

  const activeConnectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    console.log("begin SignalR connection.")

    let isMounted = true;

    const newConnection = new HubConnectionBuilder()
      .withUrl(`/hub`, {
        withCredentials: true,
        transport: HttpTransportType.WebSockets,
      })
      .configureLogging(LogLevel.Trace)
      .withAutomaticReconnect()
      .build();

    activeConnectionRef.current = newConnection;
    setConnection(newConnection);

    newConnection.onreconnecting(() => {
      if (activeConnectionRef.current === newConnection) {
        setIsConnected(false);
      }
    });

    newConnection.onreconnected((connectionId) => {
      if (activeConnectionRef.current === newConnection) {
        setIsConnected(true);

        if (connectionId) {
          apiClient.defaults.headers.common['X-SignalR-Connection-Id'] = connectionId;
          graphqlClient.defaults.headers.common['X-SignalR-Connection-Id'] = connectionId;
        }
      }
    });

    newConnection.onclose(() => {
      if (activeConnectionRef.current === newConnection) {
        setIsConnected(false);

        delete apiClient.defaults.headers.common['X-SignalR-Connection-Id'];
        delete graphqlClient.defaults.headers.common['X-SignalR-Connection-Id'];
      }
    });

    // Start connection
    const startPromise = newConnection.start();

    startPromise.then(() => {
      if (isMounted && activeConnectionRef.current === newConnection) {
        setIsConnected(true);

        if (newConnection.connectionId) {
          apiClient.defaults.headers.common['X-SignalR-Connection-Id'] = newConnection.connectionId;
          graphqlClient.defaults.headers.common['X-SignalR-Connection-Id'] = newConnection.connectionId;
        }
      }
    }).catch((err) => {
      console.error("failed to connect to SignalR:", err);
    });

    return () => {
      isMounted = false;

      if (activeConnectionRef.current === newConnection) {
        activeConnectionRef.current = null;
        setIsConnected(false);

        delete apiClient.defaults.headers.common['X-SignalR-Connection-Id'];
        delete graphqlClient.defaults.headers.common['X-SignalR-Connection-Id'];
      }

      startPromise.finally(() => {
        if (newConnection.state !== HubConnectionState.Disconnected) {
          console.log("stopping SignalR connection...");
          newConnection.stop().catch(console.error);
        }
      });
    };
  }, []);

  return (
    <SignalRConnectionContext.Provider value={{ connection, isConnected }}>
      {children}
    </SignalRConnectionContext.Provider>
  );
}