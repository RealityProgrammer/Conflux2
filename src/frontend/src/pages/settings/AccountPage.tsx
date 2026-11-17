import {
  ContextMenu,
  Label,
  Separator,
  unstable_PasswordToggleField as PasswordToggleField,
} from "radix-ui";
import {
  BsDoorOpenFill,
  BsExclamationTriangle,
  BsEye,
  BsEyeSlash,
  BsKeyFill,
} from "react-icons/bs";
import DateTimeText from "../../components/DateTimeText.tsx";
import useQuerySessions from "../../hooks/useQuerySessions.ts";
import Spinner from "../../components/Spinner.tsx";
import type {
  ServiceResponse,
  SessionDetails,
  SessionDevice,
  SessionsQueryResult,
} from "../../api/types.ts";
import { FaDesktop, FaPhone, FaTablet } from "react-icons/fa6";
import { type ReactNode, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "../../api/authService.ts";
import { toast } from "react-toastify";
import { useAuth } from "../../contexts/AuthContext.tsx";
import { useGetSessionUserAccountInfoQuery } from "../../graphql/queries.ts";
import { masker } from "../../utils/masker.ts";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import ValueRequirementsList from "../../components/ValueRequirementsList.tsx";
import ModalForm from "../../components/ModalForm.tsx";
import ErrorPopover from "../../components/ErrorPopover.tsx";
import { HttpStatusCode } from "axios";
import ErrorText from "../../components/ErrorText.tsx";

export default function AccountPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Account</h1>
      <p className="text-sm text-gray-400">Peak OPSEC happen here.</p>

      <Separator.Root className="horizontal-separator my-2" />

      <h2 className="text-xl font-semibold">Information</h2>
      <p className="text-sm text-gray-400">Account information go here.</p>

      <AccountInfoContainer />

      <Separator.Root className="horizontal-separator my-2" />

      <h2 className="text-xl font-semibold">Login Sessions</h2>
      <p className="text-sm text-gray-400">
        Here are the history of login of this account. Take a good look at it
        and remove any suspicious session.
      </p>

      <AccountSessions />
    </>
  );
}

function AccountInfoContainer() {
  const auth = useAuth();

  const { data, isLoading, isError } = useGetSessionUserAccountInfoQuery(
    undefined,
    {
      staleTime: 30 * 60 * 1000,
    },
  );

  const [showEmail, setShowEmail] = useState(false);

  return (
    <div className="container mx-auto w-xl rounded-lg border-2 border-gray-600 bg-black/10 p-1 shadow-md">
      {isLoading ? (
        <div className="flex size-full h-32 flex-row items-center justify-center">
          <Spinner className="size-8 fill-white" />
        </div>
      ) : isError || !data ? (
        <div className="flex size-full h-32 flex-col items-center justify-center gap-1">
          <BsExclamationTriangle className="size-8 fill-white" />
          <p className="text-center">Failed to get account information</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-gray-700/50 px-3 py-2 last:border-none">
            <span>Username</span>

            <span className="text-right">
              {auth.userProfile?.userName ?? "???"}
            </span>
          </div>

          <Separator.Root className="horizontal-separator mx-3 my-2" />

          <div className="flex items-center justify-between border-b border-gray-700/50 px-3 py-2 last:border-none">
            <span>Email</span>

            <span className="text-right">
              {showEmail
                ? (data.sessionUser?.email ?? "???")
                : masker.maskEmail(data.sessionUser?.email ?? "???")}

              <button
                className="button-theme-primary2 button-cursor ml-2 w-15 cursor-pointer rounded-md py-1.5 shadow-md"
                onClick={() => setShowEmail(!showEmail)}
              >
                {showEmail ? "Hide" : "Show"}
              </button>
            </span>
          </div>

          <Separator.Root className="horizontal-separator mx-3 my-2" />

          <div className="flex items-center justify-between border-b border-gray-700/50 px-3 py-2 last:border-none">
            <span>Phone Number</span>

            <span className="text-right">TODO</span>
          </div>

          <Separator.Root className="horizontal-separator mx-3 my-2" />

          <div className="flex items-center justify-between border-b border-gray-700/50 px-3 py-2 last:border-none">
            <span>Password</span>

            <span className="text-right">
              <ChangePasswordDialog
                trigger={
                  <button className="button-theme-primary2 button-cursor cursor-pointer rounded-md px-3 py-1.5 shadow-md">
                    Edit
                  </button>
                }
              />
            </span>
          </div>

          <Separator.Root className="horizontal-separator mx-3 my-2" />

          <div className="flex items-center justify-between border-b border-gray-700/50 px-3 py-2 last:border-none">
            <span>Multi-factor authentication</span>

            <span className="text-right">TODO</span>
          </div>
        </>
      )}
    </div>
  );
}

const changePasswordSchema = z
  .object({
    oldPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine(({ newPassword, confirmPassword }, ctx) => {
    if (confirmPassword !== newPassword) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords are mismatch.",
        path: ["confirmPassword"],
      });
    }
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

function ChangePasswordDialog({ trigger }: { trigger: ReactNode }) {
  const formMethods = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const {
    register,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = formMethods;

  const newPassword = watch("newPassword", "");

  const onSubmit = async (values: ChangePasswordFormValues) => {
    var response = await authService.changePassword(
      values.oldPassword,
      values.newPassword,
    );

    if (response.success) {
      toast.success("Password changed successfully.");
      reset();
    } else {
      if (
        response.statusCode === HttpStatusCode.BadRequest &&
        response.error?.code === "ValidationErrorsOccurred"
      ) {
        const details = response.error.details as Record<
          "oldPassword" | "newPassword",
          string[]
        >;

        if (details.oldPassword && details.oldPassword.length > 0) {
          setError("oldPassword", {
            message: details.oldPassword[0],
          });
        }

        if (details.newPassword && details.newPassword.length > 0) {
          setError("newPassword", {
            message: details.newPassword[0],
          });
        }
      } else {
        formMethods.setError("root", {
          message: response.error?.message ?? "An unexpected error occurred.",
        });
      }
    }
  };

  return (
    <ModalForm
      formMethods={formMethods}
      onSubmit={onSubmit}
      headerIcon={<BsKeyFill className="size-10 fill-white" />}
      title="Change Password"
      subtitle="Hotswap the door key immediately now!"
      trigger={trigger}
      contentClassName="centered-dialog w-xl bg-gray-650 text-white rounded-xl"
      submitButton={
        <button
          type="submit"
          className="button-theme-primary button-cursor w-40 rounded-md py-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex flex-row items-center justify-center">
              <Spinner className="size-6 fill-white" />
            </div>
          ) : (
            "Change Password"
          )}
        </button>
      }
    >
      <div className="space-y-3">
        <div>
          <Label.Root className="label mb-1 block">Old Password</Label.Root>

          <PasswordToggleField.Root>
            <div className="flex w-full flex-nowrap">
              <ErrorPopover
                open={!!errors.oldPassword}
                content={errors.oldPassword?.message ?? "???"}
              >
                <PasswordToggleField.Input
                  placeholder="Enter old password"
                  className="input-field mr-1 h-10 flex-1 px-3"
                  {...register("oldPassword")}
                />
              </ErrorPopover>

              <PasswordToggleField.Toggle className="input-field h-10 flex-none p-2">
                <PasswordToggleField.Icon
                  visible={<BsEye className="size-6" />}
                  hidden={<BsEyeSlash className="size-6" />}
                />
              </PasswordToggleField.Toggle>
            </div>
          </PasswordToggleField.Root>
        </div>

        <div>
          <Label.Root className="label mb-1 block">New Password</Label.Root>

          <PasswordToggleField.Root>
            <div className="flex w-full flex-nowrap">
              <PasswordToggleField.Input
                placeholder="Enter new password"
                className="input-field mr-1 h-10 flex-1 px-3"
                {...register("newPassword")}
              />

              <PasswordToggleField.Toggle className="input-field h-10 flex-none p-2">
                <PasswordToggleField.Icon
                  visible={<BsEye className="size-6" />}
                  hidden={<BsEyeSlash className="size-6" />}
                />
              </PasswordToggleField.Toggle>
            </div>
          </PasswordToggleField.Root>

          <ValueRequirementsList
            rules={[
              {
                label: "At least 8 characters",
                fulfilled: newPassword.length >= 8,
                error:
                  errors.newPassword?.message?.includes("must be at least") ||
                  errors.newPassword?.message?.includes("is required"),
              },
              {
                label: "Contain uppercase",
                fulfilled: /\p{Lu}/u.test(newPassword),
                error:
                  errors.newPassword?.message?.includes("one uppercase") ||
                  errors.newPassword?.message?.includes("is required"),
              },
              {
                label: "Contain numerical",
                fulfilled: /\p{N}/u.test(newPassword),
                error:
                  errors.newPassword?.message?.includes("one digit") ||
                  errors.newPassword?.message?.includes("is required"),
              },
              {
                label: "Contain special",
                fulfilled: /[^\p{L}\p{N}]/u.test(newPassword),
                error:
                  errors.newPassword?.message?.includes(
                    "one non alphanumeric",
                  ) || errors.newPassword?.message?.includes("is required"),
              },
            ]}
            className="mt-2 grid grid-cols-2 gap-y-1"
          />
        </div>

        <div className="mt-1">
          <Label.Root className="label mb-1 block">Confirm Password</Label.Root>

          <PasswordToggleField.Root>
            <div className="flex w-full flex-nowrap">
              <ErrorPopover
                open={!!errors.confirmPassword}
                content={errors.confirmPassword?.message ?? "???"}
              >
                <PasswordToggleField.Input
                  placeholder="Enter new password (again)"
                  className="input-field mr-1 h-10 flex-1 px-3"
                  {...register("confirmPassword")}
                />
              </ErrorPopover>

              <PasswordToggleField.Toggle className="input-field h-10 flex-none p-2">
                <PasswordToggleField.Icon
                  visible={<BsEye className="size-6" />}
                  hidden={<BsEyeSlash className="size-6" />}
                />
              </PasswordToggleField.Toggle>
            </div>
          </PasswordToggleField.Root>
        </div>

        {errors.root && (
          <ErrorText className="mt-2 block text-center">
            {errors.root.message}
          </ErrorText>
        )}
      </div>
    </ModalForm>
  );
}

const DeviceIcons: Record<SessionDevice, ReactNode> = {
  Desktop: <FaDesktop className="size-8 flex-none fill-white" />,
  Phone: <FaPhone className="size-8 flex-none fill-white" />,
  Tablet: <FaTablet className="size-8 flex-none fill-white" />,
  Other: <FaDesktop className="size-8 flex-none fill-white" />,
};

function AccountSessions() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuerySessions({
    retry: false,
  });

  const [deletingSessions, setDeletingSessions] = useState<string[]>([]);

  const deleteSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await authService.deleteSession(sessionId);
    },
    onMutate: async (sessionId: string) => {
      setDeletingSessions((prev: string[]): string[] => [...prev, sessionId]);
    },
    onSuccess: (data: ServiceResponse, sessionId: string) => {
      if (data.success) {
        toast.success("Session deleted successfully.");

        queryClient.setQueryData<SessionsQueryResult>(
          useQuerySessions.queryKey,
          (oldData) => {
            if (!oldData) return oldData;

            return {
              ...oldData,
              allSessions: oldData.allSessions.filter(
                (s) => s.sessionId !== sessionId,
              ),
            };
          },
        );
      } else {
        toast.error("Failed to delete session.");
      }
    },
    onError: (_error: Error) => {
      toast.error("Failed to delete session.");
    },
    onSettled: async (
      _data: ServiceResponse | undefined,
      _error: Error | null,
      sessionId: string,
    ) => {
      setDeletingSessions((prev: string[]) =>
        prev.filter((v) => v !== sessionId),
      );
    },
  });

  const deleteOtherSessionsMutation = useMutation({
    mutationFn: async () => {
      return await authService.deleteOtherSessions();
    },
    onMutate: async () => {
      if (!data) return;

      setDeletingSessions(
        data.allSessions
          .filter((s) => s.sessionId !== data.currentSession.sessionId)
          .map((s) => s.sessionId),
      );
    },
    onSuccess: (data: ServiceResponse) => {
      if (data.success) {
        toast.success("Sessions deleted successfully.");

        queryClient.setQueryData<SessionsQueryResult>(
          useQuerySessions.queryKey,
          (oldData) => {
            if (!oldData) return oldData;

            return {
              ...oldData,
              allSessions: oldData.allSessions.filter(
                (s) => s.sessionId === oldData.currentSession.sessionId,
              ),
            };
          },
        );
      } else {
        toast.error("Failed to delete sessions.");
      }
    },
    onError: (_error: Error) => {
      toast.error("Failed to delete sessions.");
    },
    onSettled: async (
      _data: ServiceResponse | undefined,
      _error: Error | null,
    ) => {
      setDeletingSessions([]);
    },
  });

  return (
    <div className="mt-2 flex flex-col items-center justify-center gap-2">
      <div className="container max-w-2xl">
        <p className="label mb-1">Current session</p>

        <div className="rounded-lg border-2 border-gray-600 bg-black/10 shadow-md">
          {isLoading ? (
            <SessionElementSkeleton />
          ) : isError || !data ? (
            <div className="flex h-14 w-full flex-row items-center justify-center">
              <BsExclamationTriangle className="size-8 fill-white" />
            </div>
          ) : (
            <SessionElement
              details={data.currentSession}
              isThisSession={false}
            />
          )}
        </div>

        <p className="label mt-2 mb-1">All sessions</p>

        <div className="h-96 scrollbar-none overflow-y-scroll rounded-lg border-2 border-gray-600 bg-black/10 shadow-md">
          {isLoading ? (
            <>
              {Array.from({ length: 7 }, (_, i) => (
                <SessionElementSkeleton key={i} />
              ))}
            </>
          ) : isError || !data ? (
            <div className="flex size-full flex-col items-center justify-center gap-1">
              <BsExclamationTriangle className="size-8 fill-white" />
              <p>Failed to load session details.</p>
            </div>
          ) : (
            <>
              {data.allSessions
                .filter(
                  (s: SessionDetails) =>
                    !deletingSessions.includes(s.sessionId),
                )
                .map((details) => (
                  <SessionElement
                    key={details.sessionId}
                    details={details}
                    className="hover-highlight"
                    isThisSession={
                      details.sessionId === data.currentSession.sessionId
                    }
                    menu={details.sessionId !== data.currentSession.sessionId}
                    handleLogout={() =>
                      deleteSessionMutation.mutate(details.sessionId)
                    }
                  />
                ))}
            </>
          )}
        </div>

        <div className="mt-2 flex flex-row items-center justify-end gap-2">
          <button
            className="button-theme-danger button-cursor rounded-md px-3 py-2"
            onClick={() => deleteOtherSessionsMutation.mutate()}
          >
            Delete all other sessions
          </button>
        </div>
      </div>
    </div>
  );
}

function SessionElement({
  details,
  className = "",
  isThisSession = false,
  menu = false,
  handleLogout,
}: {
  details: SessionDetails;
  className?: string;
  isThisSession?: boolean;
  menu?: boolean;
  handleLogout?: () => void;
}) {
  if (!menu) {
    return (
      <div
        className={`flex h-14 flex-row items-center justify-center gap-2 px-2 ${className}`}
      >
        {DeviceIcons[details.device]}

        <div className="flex-1">
          <p className="text-sm">
            {details.browserInfo} on {details.operatingSystemInfo}
            {isThisSession && " (This session)"}
          </p>
          <p className="text-sm text-gray-400">
            Last activity:{" "}
            <DateTimeText value={new Date(details.lastActivityMs)} />{" "}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger
        className={`flex h-14 flex-row items-center justify-center gap-2 px-2 ${className}`}
      >
        {DeviceIcons[details.device]}

        <div className="flex-1">
          <p className="text-sm">
            {details.browserInfo} on {details.operatingSystemInfo}
            {isThisSession && " (This session)"}
          </p>
          <p className="text-sm text-gray-400">
            Last activity:{" "}
            <DateTimeText value={new Date(details.lastActivityMs)} />{" "}
          </p>
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content
          className="bg-gray-725 w-64 space-y-1 overflow-hidden rounded-md border border-gray-500 p-1 text-sm text-white shadow-lg"
          alignOffset={5}
        >
          <ContextMenu.Item
            className="dropdown-item-default"
            onSelect={handleLogout}
          >
            <span className="font-semibold text-red-500">Logout</span>{" "}
            <BsDoorOpenFill className="ml-auto size-4 fill-red-500" />
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function SessionElementSkeleton() {
  return (
    <div className="flex h-14 flex-row items-center justify-center gap-2 px-2">
      <Spinner className="size-8 flex-none fill-white" />

      <div className="flex-1 space-y-1">
        <div className="h-5 w-1/4 animate-pulse rounded-full bg-white/10"></div>
        <div className="h-5 w-1/3 animate-pulse rounded-full bg-white/10"></div>
      </div>
    </div>
  );
}
