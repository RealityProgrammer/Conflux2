import { useEffect, useRef } from "react";
import { animate, utils } from "animejs";
import { BsArrowRepeat, BsEye, BsEyeSlash } from "react-icons/bs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label, unstable_PasswordToggleField as PasswordToggleField } from "radix-ui";
import ErrorText from "../../components/ErrorText.tsx";
import ValueRequirementsList from "../../components/ValueRequirementsList.tsx";
import ErrorPopover from "../../components/ErrorPopover.tsx";
import { authService } from "../../api/authService.ts";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "react-toastify";

const resetPasswordSchema = z
  .object({
    password: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine(({ password, confirmPassword }, ctx) => {
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: "custom",
        message: "Passwords are mismatch.",
        path: ["confirmPassword"],
      });
    }
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    clearErrors,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const passwordValue = watch("password", "");

  const onSubmit = async (values: ResetPasswordFormValues) => {
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      toast.error("Failed to reset password.");
      return;
    }

    const response = await authService.resetPassword(email, token, values.password);

    if (response.success) {
      toast.success("Password reset successfully.");
      navigate({
        pathname: "/auth",
        hash: "login",
      });
    } else {
      toast.error("Failed to reset password.");
    }
  };

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-slate-950 font-sans select-none">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(12,63,23,0.45)_100%)]" />

      {Array.from({ length: 5 }).map((_, index) => (
        <ShockwaveRing key={index} />
      ))}

      <div className="flex size-full flex-row items-center justify-center">
        <div className="relative w-xl rounded-lg bg-gray-700 text-white">
          <header className="flex flex-row items-center gap-2 border-b border-b-gray-600 px-3 py-2">
            <BsArrowRepeat className="size-10 flex-none fill-white" />

            <div className="flex-1">
              <h1 className="text-xl font-bold text-white">Reset Password</h1>

              <p className="text-sm text-gray-400">Someone made a whoopsie...</p>
            </div>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} onChange={() => clearErrors("root")}>
            <main className="panel-padding space-y-3">
              <div>
                <Label.Root className="label mb-1 block">New Password</Label.Root>

                <PasswordToggleField.Root>
                  <div className="flex w-full flex-nowrap">
                    <PasswordToggleField.Input
                      placeholder="Enter new password"
                      className="input-field mr-1 h-10 flex-1 px-3"
                      {...register("password")}
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
                      fulfilled: passwordValue.length >= 8,
                      error:
                        errors.password?.message?.includes("must be at least") ||
                        errors.password?.message?.includes("is required"),
                    },
                    {
                      label: "Contain uppercase",
                      fulfilled: /\p{Lu}/u.test(passwordValue),
                      error:
                        errors.password?.message?.includes("one uppercase") ||
                        errors.password?.message?.includes("is required"),
                    },
                    {
                      label: "Contain numerical",
                      fulfilled: /\p{N}/u.test(passwordValue),
                      error:
                        errors.password?.message?.includes("one digit") ||
                        errors.password?.message?.includes("is required"),
                    },
                    {
                      label: "Contain special",
                      fulfilled: /[^\p{L}\p{N}]/u.test(passwordValue),
                      error:
                        errors.password?.message?.includes("one non alphanumeric") ||
                        errors.password?.message?.includes("is required"),
                    },
                  ]}
                  className="mt-2 grid grid-cols-2 gap-y-1"
                />
              </div>

              <div>
                <Label.Root className="label mb-1 block">Confirm Password</Label.Root>

                <PasswordToggleField.Root>
                  <div className="flex w-full flex-nowrap">
                    <ErrorPopover open={!!errors.confirmPassword} content={errors.confirmPassword?.message}>
                      <PasswordToggleField.Input
                        placeholder="Enter Password (Again)"
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
                <ErrorText className="mt-1 block text-center">{errors.root.message}</ErrorText>
              )}
            </main>

            <footer className="flex flex-row justify-end gap-3 border-t border-t-gray-600 p-4">
              <button type="submit" className="button-theme-primary cursor-pointer rounded-md px-3 py-2">
                Confirm Password
              </button>
            </footer>
          </form>
        </div>
      </div>
    </div>
  );
}

function ShockwaveRing() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const runShockwave = () => {
      if (!ref.current) return;

      const randomX = utils.random(10, 90);
      const randomY = utils.random(10, 90);
      const randomDuration = utils.random(1200, 2800);
      const randomSize = utils.random(250, 450);
      const randomBorderSize = utils.random(4, 10);

      utils.set(ref.current, {
        left: `${randomX}%`,
        top: `${randomY}%`,
        width: "0px",
        height: "0px",
        opacity: 0.5,
        borderWidth: `${randomBorderSize}px`,
      });

      animate(ref.current, {
        width: `${randomSize}px`,
        height: `${randomSize}px`,
        opacity: 0,
        duration: randomDuration,
        ease: "linear",
        onComplete: () => {
          utils.set(ref.current!, { opacity: 0 });
          const nextDelay = utils.random(500, 2500);
          setTimeout(runShockwave, nextDelay);
        },
      });
    };

    const initialDelay = utils.random(0, 2000);
    const timer = setTimeout(runShockwave, initialDelay);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-gray-400"
      style={{ opacity: 0 }} // Hidden initially so no static dot shows up
    />
  );
}
