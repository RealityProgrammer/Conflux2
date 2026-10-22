import {ContextMenu, Label, Separator, unstable_PasswordToggleField as PasswordToggleField} from "radix-ui";
import {
  BsDoorOpenFill,
  BsExclamationTriangle,
  BsEye,
  BsEyeSlash,
  BsKeyFill
} from "react-icons/bs";
import { Dialog as RadixDialog } from "radix-ui";
import DateTimeText from "../../components/DateTimeText.tsx";
import useSessionsQuery from "../../hooks/useSessionsQuery.ts";
import Spinner from "../../components/Spinner.tsx";
import type {ServiceResponse, SessionDetails, SessionDevice, SessionsQueryResult} from "../../api/types.ts";
import {FaDesktop, FaPhone, FaTablet} from "react-icons/fa6";
import {type ReactNode, useState} from "react";
import {useMutation, useQueryClient} from "@tanstack/react-query";
import {authService} from "../../api/authService.ts";
import {toast} from "react-toastify";
import Container from "../../components/Container.tsx";
import {useAuth} from "../../contexts/AuthContext.tsx";
import {useGetSessionUserAccountInfoQuery} from "../../graphql/queries.ts";
import {masker} from "../../utils/masker.ts";
import Dialog from "../../components/Dialog.tsx";
import AlertDialog from "../../components/AlertActionDialog.tsx";
import {z} from "zod";
import {type FieldError, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import ValueRequirementsList from "../../components/ValueRequirementsList.tsx";
import ModalForm from "../../components/ModalForm.tsx";
import ErrorPopover from "../../components/ErrorPopover.tsx";
import {HttpStatusCode} from "axios";
import ErrorText from "../../components/ErrorText.tsx";

export default function AccountPage() {
  return (
    <>
      <h1 className="font-bold text-2xl">Account</h1>
      <p className="text-gray-400 text-sm">Peak OPSEC happen here.</p>

      <Separator.Root className="horizontal-separator my-2"/>

      <h2 className="font-semibold text-xl">Information</h2>
      <p className="text-gray-400 text-sm">Account information go here.</p>
      
      <AccountInfoContainer/>
      
      <Separator.Root className="horizontal-separator my-2"/>
      
      <h2 className="font-semibold text-xl">Login Sessions</h2>
      <p className="text-gray-400 text-sm">Here are the history of login of this account. Take a good look at it and remove any suspicious session.</p>
      
      <AccountSessions/>
    </>
  );
}

function AccountInfoContainer() {
  const auth = useAuth();
  
  const { data, isLoading, isError } = useGetSessionUserAccountInfoQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 30 * 60 * 1000,
  });

  const [showEmail, setShowEmail] = useState(false);
  
  return (
    <Container maxBreakpoint="2xl" className="shadow-md border-2 border-gray-600 rounded-lg bg-black/10 p-1">
      {isLoading ? (
        <div className="size-full h-32 flex flex-row justify-center items-center">
          <Spinner className="size-8 fill-white"/>
        </div>
      ) : isError || !data ? (
        <div className="size-full h-32 flex flex-col gap-1 justify-center items-center">
          <BsExclamationTriangle className="size-8 fill-white"/>
          <p className="text-center">Failed to get account information</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700/50 last:border-none">
            <span>Username</span>
    
            <span className="text-right">{auth.userProfile?.userName ?? "???"}</span>
          </div>
    
          <Separator.Root className="horizontal-separator mx-3 my-2"/>
    
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700/50 last:border-none">
            <span>Email</span>
    
            <span className="text-right">
              {showEmail ? data.sessionUser?.email ?? "???" : masker.maskEmail(data.sessionUser?.email ?? "???")}

              <button 
                className="ml-2 button-theme-primary2 button-cursor shadow-md w-15 py-1.5 rounded-md cursor-pointer"
                onClick={() => setShowEmail(!showEmail)}
              >
                {showEmail ? "Hide" : "Show"}
              </button>
            </span>
          </div>
    
          <Separator.Root className="horizontal-separator mx-3 my-2"/>
    
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700/50 last:border-none">
            <span>Phone Number</span>
    
            <span className="text-right">TODO</span>
          </div>
    
          <Separator.Root className="horizontal-separator mx-3 my-2"/>
    
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700/50 last:border-none">
            <span>Password</span>
    
            <span className="text-right">
              <ChangePasswordDialog trigger={(
                <button className="button-theme-primary2 button-cursor shadow-md px-3 py-1.5 rounded-md cursor-pointer">Edit</button>
              )}/>
            </span>
          </div>
    
          <Separator.Root className="horizontal-separator mx-3 my-2"/>
    
          <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700/50 last:border-none">
            <span>Multi-factor authentication</span>
    
            <span className="text-right">TODO</span>
          </div>
        </>
      )}
    </Container>
  );
}

const changePasswordSchema = z.object({
  oldPassword: z.string(),
  newPassword: z.string(),
  confirmPassword: z.string(),
}).superRefine(({ newPassword, confirmPassword }, ctx) => {
  if (confirmPassword !== newPassword) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords are mismatch.",
      path: ['confirmPassword']
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
    formState: { errors, isSubmitting }
  } = formMethods;
  
  const newPassword = watch("newPassword", "");
  
  const onSubmit = async (values: ChangePasswordFormValues) => {
    var response = await authService.changePassword(values.oldPassword, values.newPassword);
    
    if (response.success) {
      toast.success("Password changed successfully.");
      reset();
    } else {
      if (response.statusCode === HttpStatusCode.BadRequest && response.error?.code === "ValidationErrorsOccurred") {
        const details = response.error.details as Record<"OldPassword" | "NewPassword", string[]>;

        if (details.OldPassword && details.OldPassword.length > 0) {
          setError("oldPassword", {
            message: details.OldPassword[0],
          });
        }
        
        if (details.NewPassword && details.NewPassword.length > 0) {
          setError("newPassword", {
            message: details.NewPassword[0],
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
      headerIcon={<BsKeyFill className="size-10 fill-white"/>}
      title="Change Password"
      subtitle="Hotswap the door key immediately now!"
      trigger={trigger}
      contentClassName="centered-dialog w-xl bg-gray-650 text-white rounded-lg"
      submitButton={(
        <button type="submit" className="button-theme-primary button-cursor w-40 py-2 rounded-md" disabled={isSubmitting}>
          {isSubmitting ? (
            <div className="flex flex-row justify-center items-center">
              <Spinner className="size-6 fill-white"/>
            </div>
          ) : "Change Password"}
        </button>
      )}
    >
      <div className="space-y-3">
        <div>
          <Label.Root className="block label mb-1">Old Password</Label.Root>

          <PasswordToggleField.Root>
            <div className="flex flex-nowrap w-full">
              <ErrorPopover open={!!errors.oldPassword} content={errors.oldPassword?.message ?? "???"}>
                <PasswordToggleField.Input
                  placeholder="Enter old password"
                  className="flex-1 h-10 px-3 input-field mr-1"
                  {...register("oldPassword")}
                />
              </ErrorPopover>

              <PasswordToggleField.Toggle className="flex-none h-10 p-2 input-field">
                <PasswordToggleField.Icon
                  visible={<BsEye className="size-6"/>}
                  hidden={<BsEyeSlash className="size-6"/>}
                />
              </PasswordToggleField.Toggle>
            </div>
          </PasswordToggleField.Root>
        </div>

        <div>
          <Label.Root className="block label mb-1">New Password</Label.Root>

          <PasswordToggleField.Root>
            <div className="flex flex-nowrap w-full">
              <PasswordToggleField.Input
                placeholder="Enter new password"
                className="flex-1 h-10 px-3 input-field mr-1"
                {...register("newPassword")}
              />

              <PasswordToggleField.Toggle className="flex-none h-10 p-2 input-field">
                <PasswordToggleField.Icon
                  visible={<BsEye className="size-6"/>}
                  hidden={<BsEyeSlash className="size-6"/>}
                />
              </PasswordToggleField.Toggle>
            </div>
          </PasswordToggleField.Root>

          <ValueRequirementsList
            rules={[
              {
                label: "At least 8 characters",
                fulfilled: newPassword.length >= 8,
                error: errors.newPassword?.message?.includes("must be at least") || errors.newPassword?.message?.includes("is required"),
              },
              {
                label: "Contain uppercase",
                fulfilled: /\p{Lu}/u.test(newPassword),
                error: errors.newPassword?.message?.includes("one uppercase") || errors.newPassword?.message?.includes("is required"),
              },
              {
                label: "Contain numerical",
                fulfilled: /\p{N}/u.test(newPassword),
                error: errors.newPassword?.message?.includes("one digit") || errors.newPassword?.message?.includes("is required"),
              },
              {
                label: "Contain special",
                fulfilled: /[^\p{L}\p{N}]/u.test(newPassword),
                error: errors.newPassword?.message?.includes("one non alphanumeric") || errors.newPassword?.message?.includes("is required"),
              },
            ]}
            className="grid grid-cols-2 gap-y-1 mt-2"
          />
        </div>

        <div className="mt-1">
          <Label.Root className="block label mb-1">Confirm Password</Label.Root>

          <PasswordToggleField.Root>
            <div className="flex flex-nowrap w-full">
              <ErrorPopover open={!!errors.confirmPassword} content={errors.confirmPassword?.message ?? "???"}>
                <PasswordToggleField.Input
                  placeholder="Enter new password (again)"
                  className="flex-1 h-10 px-3 input-field mr-1"
                  {...register("confirmPassword")}
                />
              </ErrorPopover>

              <PasswordToggleField.Toggle className="flex-none h-10 p-2 input-field">
                <PasswordToggleField.Icon
                  visible={<BsEye className="size-6"/>}
                  hidden={<BsEyeSlash className="size-6"/>}
                />
              </PasswordToggleField.Toggle>
            </div>
          </PasswordToggleField.Root>
        </div>

        {errors.root && (
          <ErrorText className="block text-center mt-2">{errors.root.message}</ErrorText>
        )}
      </div>
    </ModalForm>
  );
}

const DeviceIcons: Record<SessionDevice, ReactNode> = {
  "Desktop": <FaDesktop className="flex-none size-8 fill-white"/>,
  "Phone" : <FaPhone className="flex-none size-8 fill-white"/>,
  "Tablet" : <FaTablet className="flex-none size-8 fill-white"/>,
  "Other" : <FaDesktop className="flex-none size-8 fill-white"/>,
}

function AccountSessions() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, isError } = useSessionsQuery({
    refetchOnWindowFocus: false,
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
          useSessionsQuery.queryKey,
          (oldData) => {
            if (!oldData) return oldData;
            
            return {
              ...oldData,
              allSessions: oldData.allSessions.filter(s => s.sessionId !== sessionId),
            }
          }
        )
      } else {
        toast.error("Failed to delete session.");
      }
    },
    onError: (_error: Error) => {
      toast.error("Failed to delete session.");
    },
    onSettled: async (_data: ServiceResponse | undefined, _error: Error | null, sessionId: string) => {
      setDeletingSessions((prev: string[]) => prev.filter(v => v !== sessionId));
    },
  });

  const deleteOtherSessionsMutation = useMutation({
    mutationFn: async () => {
      return await authService.deleteOtherSessions();
    },
    onMutate: async () => {
      if (!data) return;
      
      setDeletingSessions(data.allSessions.filter(s => s.sessionId !== data.currentSession.sessionId).map(s => s.sessionId));
    },
    onSuccess: (data: ServiceResponse) => {
      if (data.success) {
        toast.success("Sessions deleted successfully.");

        queryClient.setQueryData<SessionsQueryResult>(
          useSessionsQuery.queryKey,
          (oldData) => {
            if (!oldData) return oldData;

            return {
              ...oldData,
              allSessions: oldData.allSessions.filter(s => s.sessionId === oldData.currentSession.sessionId),
            }
          }
        )
      } else {
        toast.error("Failed to delete sessions.");
      }
    },
    onError: (_error: Error) => {
      toast.error("Failed to delete sessions.");
    },
    onSettled: async (_data: ServiceResponse | undefined, _error: Error | null) => {
      setDeletingSessions([]);
    },
  });
  
  return (
    <div className="mt-2 flex flex-col items-center justify-center gap-2">
      <Container maxBreakpoint="2xl">
        <p className="label mb-1">Current session</p>

        <div className="shadow-md border-2 border-gray-600 rounded-lg bg-black/10">
          {isLoading ? (
            <SessionElementSkeleton/>
          ) : isError || !data ? (
            <div className="h-14 w-full flex flex-row justify-center items-center">
              <BsExclamationTriangle className="size-8 fill-white"/>
            </div>
          ) : (
            <SessionElement details={data.currentSession} isThisSession={false}/>
          )}
        </div>
      </Container>
      
      <Container maxBreakpoint="2xl">
        <p className="label mb-1">All sessions</p>

        <div className="shadow-md border-2 border-gray-600 rounded-lg bg-black/10 h-96 overflow-y-scroll scrollbar-none">
          {isLoading ? (
            <>
              {Array.from({ length: 7 }, (_, i) => (
                <SessionElementSkeleton key={i}/>
              ))}
            </>
          ) : isError || !data ? (
            <div className="size-full flex flex-col gap-1 justify-center items-center">
              <BsExclamationTriangle className="size-8 fill-white"/>
              <p>Failed to load session details.</p>
            </div>
          ) : (
            <>
              {data.allSessions.filter((s: SessionDetails) => !deletingSessions.includes(s.sessionId)).map((details) => (
                <SessionElement 
                  key={details.sessionId} 
                  details={details}
                  className="hover-highlight"
                  isThisSession={details.sessionId === data.currentSession.sessionId}
                  menu={details.sessionId !== data.currentSession.sessionId}
                  handleLogout={() => deleteSessionMutation.mutate(details.sessionId)}
                />
              ))}
            </>
          )}
        </div>
        
        <div className="mt-2 flex flex-row justify-end items-center gap-2">
          <button 
            className="button-theme-danger px-3 py-2 button-cursor rounded-md"
            onClick={() => deleteOtherSessionsMutation.mutate()}
          >
            Delete all other sessions
          </button>
        </div>
      </Container>
    </div>
  );
}

function SessionElement({
  details, 
  className = "", 
  isThisSession = false,
  menu = false,
  handleLogout,
}: { details: SessionDetails, className?: string, isThisSession?: boolean, menu?: boolean, handleLogout?: () => void }) {
  if (!menu) {
    return (
      <div className={`h-14 px-2 flex flex-row justify-center items-center gap-2 ${className}`}>
        {DeviceIcons[details.device]}

        <div className="flex-1">
          <p className="text-sm">{details.browserInfo} on {details.operatingSystemInfo}{isThisSession && " (This session)"}</p>
          <p className="text-sm text-gray-400">Last activity: <DateTimeText value={new Date(details.lastActivityMs)}/> </p>
        </div>
      </div>
    );
  }
  
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger className={`h-14 px-2 flex flex-row justify-center items-center gap-2 ${className}`}>
        {DeviceIcons[details.device]}
  
        <div className="flex-1">
          <p className="text-sm">{details.browserInfo} on {details.operatingSystemInfo}{isThisSession && " (This session)"}</p>
          <p className="text-sm text-gray-400">Last activity: <DateTimeText value={new Date(details.lastActivityMs)}/> </p>
        </div>
      </ContextMenu.Trigger>
      
      <ContextMenu.Portal>
        <ContextMenu.Content
          className="w-64 overflow-hidden rounded-md bg-gray-725 shadow-lg p-1 text-white text-sm border border-gray-500 space-y-1"
          alignOffset={5}
        >
          <ContextMenu.Item
            className="dropdown-item-default"
            onSelect={handleLogout}
          >
            <span className="font-semibold text-red-500">Logout</span> <BsDoorOpenFill className="fill-red-500 size-4 ml-auto"/>
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  )
}

function SessionElementSkeleton() {
  return (
    <div className="h-14 px-2 flex flex-row justify-center items-center gap-2">
      <Spinner className="flex-none size-8 fill-white"/>

      <div className="flex-1 space-y-1">
        <div className="h-5 bg-white/10 animate-pulse w-1/4 rounded-full"></div>
        <div className="h-5 bg-white/10 animate-pulse w-1/3 rounded-full"></div>
      </div>
    </div>
  )
}