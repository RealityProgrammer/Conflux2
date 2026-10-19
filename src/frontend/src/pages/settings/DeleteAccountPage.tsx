import {Label, Select, Separator} from "radix-ui";
import {formatDate} from "date-fns";
import {z} from "zod";
import {Controller, useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {UserAccountDeleteReason} from "../../api/schema.ts";
import {sessionUserService} from "../../api/sessionUserService.ts";
import {toast} from "react-toastify";
import {BsChevronDown} from "react-icons/bs";
import SelectItem from "../../components/SelectItem.tsx";
import {useAuth} from "../../contexts/AuthContext.tsx";
import ErrorPopover from "../../components/ErrorPopover.tsx";
import {useState} from "react";
import {authService} from "../../api/authService.ts";

export default function DeleteAccountPage() {
  const auth = useAuth();
  const currentUserName = auth?.userProfile?.userName ?? "";

  const requestDeleteAccountSchema = z.object({
    reason: z.enum(UserAccountDeleteReason, { error: "Reason is required." }),
    extraMessage: z.string()
      .max(255, "Message can only have maximum length of 255 characters.")
      .nullable(),
    confirmUsername: z.string().refine((val) => val === currentUserName, {
      message: "Username does not match your account username.",
    }),
  });

  type RequestDeleteAccountFormValues = z.infer<typeof requestDeleteAccountSchema>;
  
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<RequestDeleteAccountFormValues>({
    resolver: zodResolver(requestDeleteAccountSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
    defaultValues: {
      reason: "" as UserAccountDeleteReason,
      extraMessage: "",
      confirmUsername: "",
    },
  });

  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const onSubmit = async (values: RequestDeleteAccountFormValues) => {
    const response = await authService.deleteAccount(
      values.reason, 
      values.extraMessage,
      idempotencyKey
    );
    
    if (response.success) {
      toast.success("Account deletion requested.");
      reset(values);
      auth.invalidateSession();
      setIdempotencyKey(crypto.randomUUID());
    } else {
      toast.error("Failed to request account deletion. Please try again later.");
    }
  };
  
  const today = new Date();
  const scheduledDate = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000); // increment 14 days
  
  return (
    <>
      <h1 className="font-bold text-2xl">Delete Account</h1>
      <p className="text-gray-400 text-sm">This is the end of the legend...</p>

      <Separator.Root className="horizontal-separator my-2"/>
      
      <h2 className="font-semibold text-xl">So what will happen next?</h2>
      
      <section className="flex flex-row justify-center items-center mt-2">
        <ol className="space-y-4 list-decimal pl-6">
          <li>
            <p className="font-semibold">Immediate Sign-Out</p>
            <p className="text-sm text-slate-300">
              You will be logged out on all devices immediately after confirmation.
            </p>
          </li>

          <li>
            <p className="font-semibold">14-Day Grace Period</p>
            <p className="text-sm text-slate-300">
              Your account is paused. Logging in within 14 days will prompt you to restore your account.
            </p>
          </li>

          <li>
            <p className="font-semibold">Permanent Erasure</p>
            <p className="text-sm text-slate-300">
              On <span className="text-red-400 font-bold">{formatDate(scheduledDate, "yyyy/MM/dd")}</span>, your profile and credentials will be purged. Messages remain preserved under an anonymous "Ghost" profile.
            </p>
          </li>
        </ol>
      </section>

      <h2 className="font-semibold text-xl">Now tell us...</h2>

      <div className="flex flex-col justify-center items-center">
        <form onSubmit={handleSubmit(onSubmit)} className="w-2xl border-2 border-gray-600 rounded-lg mt-2 bg-black/10 p-4">
          <div>
            <Label.Root className="label mb-1 block">...the reason you want to delete your account?</Label.Root>
            
            <Controller 
              control={control}
              name="reason"
              render={({ field }) => (
                <Select.Root
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <ErrorPopover open={!!errors.reason} content={errors.reason?.message}>
                    <Select.Trigger className="w-full input-field h-10 inline-flex flex-row items-center gap-2">
                      <Select.Value placeholder="Select reason"/>
                      
                      <Select.Icon className="fill-white flex-none ml-auto">
                        <BsChevronDown className="size-4"/>
                      </Select.Icon>
                    </Select.Trigger>
                  </ErrorPopover>
      
                  <Select.Portal>
                    <Select.Content
                      className="overflow-hidden bg-gray-700 text-white rounded-md w-(--radix-select-trigger-width) max-h-64"
                      position="popper"
                      side="bottom"
                      sideOffset={4}
                    >
                      <Select.Viewport className="p-1 size-full overflow-y-auto">
                        <SelectItem
                          text="Privacy Concern"
                          value={UserAccountDeleteReason.PrivacyConcern}
                        />
    
                        <SelectItem
                          text="Another account"
                          value={UserAccountDeleteReason.AnotherAccount}
                        />
    
                        <SelectItem
                          text="Bugs"
                          value={UserAccountDeleteReason.Bugs}
                        />
    
                        <SelectItem
                          text="Other"
                          value={UserAccountDeleteReason.Other}
                        />
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              )}
            />
          </div>
  
          <div className="mt-4">
            <Label.Root className="label mb-1 block">...more details about the reason?</Label.Root>

            <ErrorPopover open={!!errors.extraMessage} content={errors.extraMessage?.message}>
              <textarea
                rows={3}
                className="resize-none input-field w-full p-2"
                placeholder="Elaborate more..."
                maxLength={255}
                {...register("extraMessage")}
              />
            </ErrorPopover>
          </div>

          <div className="mt-4">
            <Label.Root className="label mb-1 block">For confirmation purpose, please enter your username into this field:</Label.Root>

            <ErrorPopover open={!!errors.confirmUsername} content={errors.confirmUsername?.message}>
              <input 
                type="text"
                className="resize-none input-field w-full h-10"
                placeholder="Your username here"
                maxLength={255}
                {...register("confirmUsername")}
              />
            </ErrorPopover>
          </div>
          
          <div className="flex flex-row justify-center items-center mt-4">
            <button type="submit" className="button-theme-danger px-3 py-2 rounded-md cursor-pointer">
              Delete Account
            </button>
          </div>
        </form>
      </div>
    </>
  );
}