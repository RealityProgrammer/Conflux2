import {PresenceStatus} from "../graphql/types.ts";
import {createContext, type ReactNode, useContext} from "react";
import {useGetSessionUserManualPresenceStatusQuery, useUpdateManualPresenceStatusMutation} from "../graphql/queries.ts";
import {useAuthorization} from "./AuthContext.tsx";
import {toast} from "react-toastify";
import useIdleTimer from "../hooks/useIdleTimer.tsx";

interface PresenceContextType {
  manualStatus: PresenceStatus; // TODO: intersect with a type containing Error value?
  effectiveStatus: PresenceStatus;
  updateManualStatus: (newStatus: PresenceStatus) => Promise<void>;
}

const PresenceContext = createContext<PresenceContextType | null>(null);

export default function PresenceProvider({children} : {children: ReactNode}) {
  const { userProfile } = useAuthorization()!;

  const isIdle = useIdleTimer();

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