import { random } from "animejs";
import { FaFireFlameCurved } from "react-icons/fa6";
import { BsExclamationTriangle, BsPersonXFill } from "react-icons/bs";
import { type CSSProperties, useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext.tsx";
import { useQuery } from "@tanstack/react-query";
import { sessionUserService } from "../api/sessionUserService.ts";
import type { AccountDeletionStatusDto, RestoreAccountResponse, ServiceResponse } from "../api/types.ts";
import Spinner from "../components/Spinner.tsx";
import { useRestoreAccountMutation } from "../hooks/useRestoreAccountMutation.ts";
import { toast } from "react-toastify";
import { useAuthStore } from "../store/useAuthStore.ts";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const GRACE_PERIOD_DAYS = 14;

export default function ImpendingDoomPage() {
  return (
    <div className="flex h-dvh w-dvw flex-row items-center justify-center bg-zinc-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-32 left-1/2 h-[60vh] w-[120vw] -translate-x-1/2 animate-[animate-fireFlicker_8s_infinite_ease-in-out] bg-linear-to-t from-red-600/30 via-orange-600/15 to-transparent blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-red-950/60 to-transparent" />

        {[...Array(random(35, 50))].map((_, i) => {
          const size = Math.random() * 4 + 2;
          const left = Math.random() * 100;
          const duration = Math.random() * 3 + 2;
          const delay = Math.random() * 5;
          const drift = `${(Math.random() - 0.5) * 150}px`;

          return (
            <div
              key={i}
              className="absolute -bottom-3 rounded-full bg-orange-400 shadow-[0_0_8px_#f97316]"
              style={
                {
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  animation: `animate-emberRise ${duration}s infinite ease-out`,
                  animationDelay: `${delay}s`,
                  "--drift": drift,
                } as CSSProperties
              }
            />
          );
        })}
      </div>

      <ContentPanel />
    </div>
  );
}

function ContentPanel() {
  const { data, isLoading, isError } = useQuery<unknown, Error, AccountDeletionStatusDto>({
    queryKey: ["GetAccountDeletionStatus"],
    queryFn: async (): Promise<AccountDeletionStatusDto> => {
      const response: ServiceResponse<AccountDeletionStatusDto> =
        await sessionUserService.getAccountDeletionStatus();

      if (!response.success) {
        throw new Error(response.error!.message!);
      }

      return response.data!;
    },
    staleTime: Infinity,
    retry: false,
  });

  return (
    <div className="relative w-xl rounded-lg bg-gray-700 text-white">
      {isLoading ? (
        <div className="flex items-center justify-center p-4">
          <Spinner className="size-10 fill-white" />
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center justify-center gap-2 p-4">
          <BsExclamationTriangle className="size-10 fill-white" />

          <p>Failed to load account deletion status...</p>
        </div>
      ) : (
        <SuccessfullyLoaded data={data} />
      )}
    </div>
  );
}

const restoreAccountSchema = z.object({
  restorationPassword: z.string(),
});

type RestoreAccountFormValues = z.infer<typeof restoreAccountSchema>;

function SuccessfullyLoaded({ data }: { data: AccountDeletionStatusDto }) {
  const { logout } = useAuth();
  const setCachedAuthorization = useAuthStore((state) => state.setCachedAuthorization);
  const navigate = useNavigate();

  const { mutate, isPending } = useRestoreAccountMutation({
    onSuccess: (data: ServiceResponse<RestoreAccountResponse>) => {
      if (data.success && data.data) {
        setCachedAuthorization(data.data.authorization);
        navigate("/lobby");
        toast.success("Account has been restored.");
      } else {
        toast.error("Failed to restore account. Please try again later.");
      }
    },
    onError: (_error) => {
      toast.error("Failed to restore account. Please try again later.");
    },
  });

  const formMethods = useForm<RestoreAccountFormValues>({
    resolver: zodResolver(restoreAccountSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const { reset, handleSubmit, register } = formMethods;

  const onRestoreAccountSubmit = (values: RestoreAccountFormValues) => {
    mutate(values.restorationPassword);
  };

  const [showRestoreForm, setShowRestoreForm] = useState(false);

  // timer related stuff
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const targetTime = new Date(data.deleteAt).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    updateCountdown(); // Run immediately on mount
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [data.deleteAt, data.scheduledAt]);

  const scheduledTime = new Date(data.scheduledAt).getTime();
  const elapsedMs = Date.now() - scheduledTime;
  const rawElapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.min(GRACE_PERIOD_DAYS, Math.max(0, rawElapsedDays));

  return (
    <>
      <header className="flex flex-row items-center gap-2 border-b border-b-gray-600 px-3 py-2">
        <BsPersonXFill className="size-10 flex-none fill-white" />

        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">Account Scheduled for Deletion</h1>

          <p className="text-sm text-gray-400">Revive or watch it wither away. Your choice.</p>
        </div>
      </header>

      <main className="panel-padding">
        <p className="mb-2">
          <span>Approximate remaining time:</span>
          <span className="float-end">
            {timeLeft.days} days, {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
          </span>
        </p>

        <div className="grid grid-cols-14 gap-1">
          {Array.from({ length: GRACE_PERIOD_DAYS }, (_, idx) => {
            const dayNumber = idx + 1;
            const isElapsed = dayNumber <= elapsedDays;
            const isCurrentDay = dayNumber === elapsedDays + 1;

            return (
              <div key={dayNumber} className="group relative flex flex-col items-center">
                {/* Day Box */}
                <div
                  className={`relative flex aspect-4/5 w-full flex-col items-center justify-center overflow-hidden rounded-lg text-xs font-medium transition-all duration-300 ${
                    isElapsed
                      ? "border-2 border-red-800/40 bg-red-950/40 text-red-400/70"
                      : isCurrentDay
                        ? "animate-pulse border-2 border-amber-500 bg-amber-500/20 text-amber-200"
                        : "border-2 border-gray-600 bg-gray-800/40 text-zinc-400"
                  } `}
                >
                  {isElapsed ? (
                    <FaFireFlameCurved className="h-3.5 w-3.5 text-red-500/60" />
                  ) : (
                    <span>{dayNumber}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="border-t border-t-gray-600 p-4">
        {showRestoreForm ? (
          <form
            onSubmit={handleSubmit(onRestoreAccountSubmit)}
            className="flex flex-row items-center justify-center gap-2"
          >
            <input
              type="password"
              placeholder="Enter restoration password..."
              className="input-field h-10 flex-1"
              autoFocus
              {...register("restorationPassword")}
            />

            <button
              type="button"
              className="flex-1 cursor-pointer px-3 py-2 text-sm text-white sm:flex-none"
              onClick={() => {
                setShowRestoreForm(false);
                reset();
              }}
              disabled={isPending}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="button-theme-primary flex-1 cursor-pointer rounded-md px-3 py-2 sm:flex-none"
              disabled={isPending}
            >
              {isPending ? "Restoring..." : "Confirm Restore"}
            </button>
          </form>
        ) : (
          <div className="flex flex-row justify-end gap-3">
            <button
              className="button-theme-danger cursor-pointer rounded-md px-3 py-2"
              disabled={isPending}
              onClick={logout}
            >
              Logout
            </button>

            <button
              className="button-theme-primary cursor-pointer rounded-md px-3 py-2"
              disabled={isPending}
              onClick={() => {
                setShowRestoreForm(true);
              }}
            >
              Restore Account
            </button>
          </div>
        )}
      </footer>
    </>
  );
}
