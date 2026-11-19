import { Label, Select, Separator } from "radix-ui";
import { formatDate } from "date-fns";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserAccountDeleteReason } from "../../api/schema.ts";
import { toast } from "react-toastify";
import { BsChevronDown } from "react-icons/bs";
import SelectItem from "../../components/SelectItem.tsx";
import { useAuth } from "../../contexts/AuthContext.tsx";
import ErrorPopover from "../../components/ErrorPopover.tsx";
import { useState } from "react";
import { authService } from "../../api/authService.ts";

export default function DeleteAccountPage() {
  const auth = useAuth();
  const currentUserName = auth?.userProfile?.userName ?? "";

  const requestDeleteAccountSchema = z.object({
    reason: z.enum(UserAccountDeleteReason, { error: "Reason is required." }),
    extraMessage: z.string().max(255, "Message can only have maximum length of 255 characters.").nullable(),
    confirmUsername: z.string().refine((val) => val === currentUserName, {
      message: "Username does not match your account username.",
    }),
    restorationPassword: z.string().min(8, "Restoration password must be at least 8 characters."),
  });

  type RequestDeleteAccountFormValues = z.infer<typeof requestDeleteAccountSchema>;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
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
      values.restorationPassword,
      idempotencyKey,
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
      <h1 className="text-2xl font-bold">Delete Account</h1>
      <p className="text-sm text-gray-400">This is the end of the legend...</p>

      <Separator.Root className="horizontal-separator my-2" />

      <h2 className="text-xl font-semibold">So what will happen next?</h2>

      <section className="mt-2 flex flex-row items-center justify-center">
        <ol className="list-decimal space-y-4 pl-6">
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
              On <span className="font-bold text-red-400">{formatDate(scheduledDate, "yyyy/MM/dd")}</span>,
              your profile and credentials will be purged. Messages remain preserved under an anonymous
              "Ghost" profile.
            </p>
          </li>
        </ol>
      </section>

      <h2 className="text-xl font-semibold">Now tell us...</h2>

      <div className="container mt-2 max-w-2xl rounded-lg border-2 border-gray-600 bg-black/10">
        <form onSubmit={handleSubmit(onSubmit)} className="p-4">
          <div>
            <Label.Root className="label mb-1 block">
              ...the reason you want to delete your account?
            </Label.Root>

            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <Select.Root value={field.value} onValueChange={field.onChange}>
                  <ErrorPopover open={!!errors.reason} content={errors.reason?.message}>
                    <Select.Trigger className="input-field inline-flex h-10 w-full flex-row items-center gap-2">
                      <Select.Value placeholder="Select reason" />

                      <Select.Icon className="ml-auto flex-none fill-white">
                        <BsChevronDown className="size-4" />
                      </Select.Icon>
                    </Select.Trigger>
                  </ErrorPopover>

                  <Select.Portal>
                    <Select.Content
                      className="max-h-64 w-(--radix-select-trigger-width) overflow-hidden rounded-md bg-gray-700 text-white"
                      position="popper"
                      side="bottom"
                      sideOffset={4}
                    >
                      <Select.Viewport className="size-full overflow-y-auto p-1">
                        <SelectItem text="Privacy Concern" value={UserAccountDeleteReason.PrivacyConcern} />

                        <SelectItem text="Another account" value={UserAccountDeleteReason.AnotherAccount} />

                        <SelectItem text="Bugs" value={UserAccountDeleteReason.Bugs} />

                        <SelectItem text="Other" value={UserAccountDeleteReason.Other} />
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
                className="input-field w-full resize-none p-2"
                placeholder="Elaborate more..."
                maxLength={255}
                {...register("extraMessage")}
              />
            </ErrorPopover>
          </div>

          <div className="mt-4">
            <Label.Root className="label mb-1 block">...the password to restore the account?</Label.Root>

            <ErrorPopover open={!!errors.restorationPassword} content={errors.restorationPassword?.message}>
              <input
                type="text"
                className="input-field h-10 w-full resize-none"
                placeholder="Enter restoration password"
                {...register("restorationPassword")}
              />
            </ErrorPopover>
          </div>

          <div className="mt-4">
            <Label.Root className="label mb-1 block">
              For confirmation purpose, please enter your username into this field:
            </Label.Root>

            <ErrorPopover open={!!errors.confirmUsername} content={errors.confirmUsername?.message}>
              <input
                type="text"
                className="input-field h-10 w-full resize-none"
                placeholder="Your username here"
                maxLength={255}
                {...register("confirmUsername")}
              />
            </ErrorPopover>
          </div>

          <div className="mt-4 flex flex-row items-center justify-center">
            <button type="submit" className="button-theme-danger cursor-pointer rounded-md px-3 py-2">
              Delete Account
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
