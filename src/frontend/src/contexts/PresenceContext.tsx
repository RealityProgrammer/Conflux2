import {PresenceStatus} from "../graphql/types.ts";
import {createContext, type ReactNode, useContext, useEffect, useRef, useState} from "react";
import {useGetSessionUserManualPresenceStatusQuery, useUpdateManualPresenceStatusMutation} from "../graphql/queries.ts";
import {useAuthorization} from "./AuthContext.tsx";
import {toast} from "react-toastify";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes before idle invoked

interface PresenceContextType {
  manualStatus: PresenceStatus; // TODO: intersect with a type containing Error value?
  effectiveStatus: PresenceStatus;
  updateManualStatus: (newStatus: PresenceStatus) => Promise<void>;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export default function PresenceProvider({children} : {children: ReactNode}) {
  const { userProfile } = useAuthorization()!;

  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<number | null>(null);

  const { data, isLoading, isError } = useGetSessionUserManualPresenceStatusQuery(
    { userId: userProfile?.id ?? "" },
    {
      enabled: !!userProfile?.id,
    }
  );

  const updateManualPresenceMutation = useUpdateManualPresenceStatusMutation({
    onMutate: async () => {
      // optimistic update
    },
    onError: (_error: Error) => {
      toast.error("Failed to update presence status.");
    },
  });

  const manualStatus = data?.user?.manualPresenceStatus ?? PresenceStatus.Offline;

  const getEffectiveStatus = (): PresenceStatus => {
    if (isLoading || isError) return PresenceStatus.Offline;

    if (manualStatus === PresenceStatus.Invisible) return PresenceStatus.Offline;
    if (manualStatus === PresenceStatus.DoNotDisturb) return PresenceStatus.DoNotDisturb;
    if (isIdle) return PresenceStatus.Idle;

    return manualStatus;
  };

  const updateManualStatus = async (newStatus: PresenceStatus) => {
    if (!data?.user?.manualPresenceStatus) return;

    updateManualPresenceMutation.mutate({ value: newStatus });
  };

  const sendIdleStateToBackend = (idle: boolean) => {
    setIsIdle(idle);

    // TODO: notify backend client has idle
    // e.g., hubConnection.invoke('SetAutoIdle', idle);
  };

  const resetIdleTimer = () => {
    if (isIdle) {
      sendIdleStateToBackend(false);  // user is back
    }

    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = window.setTimeout(() => {
      sendIdleStateToBackend(true); // user is stationary/afk
    }, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll'];

    const handleActivity = () => resetIdleTimer();

    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendIdleStateToBackend(true); // idle if tab goes to background, might be removed in the future
      } else {
        resetIdleTimer(); // no longer idle active when document comes back
      }
    };

    events.forEach(evt => window.addEventListener(evt, handleActivity));
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start the timer on initial mount
    resetIdleTimer();

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
      }
    };
  }, [isIdle]);

  return (
    <PresenceContext.Provider
      value={{
        manualStatus: data?.user?.manualPresenceStatus ?? PresenceStatus.Offline,
        effectiveStatus: getEffectiveStatus(),
        updateManualStatus,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence(): PresenceContextType {
  const context = useContext(PresenceContext);
  if (!context) throw new Error('usePresence must be used within a PresenceProvider');

  return context;
}