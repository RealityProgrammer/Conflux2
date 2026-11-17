import { useEffect, useRef, useState, type MouseEvent } from "react";
import { animate, JSAnimation, random } from "animejs";
import { useLocation, useNavigate, useRevalidator } from "react-router";
import { authService } from "../../api/authService.ts";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ServiceResponse,
} from "../../api/types.ts";
import { HttpStatusCode } from "axios";
import {
  Label,
  unstable_PasswordToggleField as PasswordToggleField,
} from "radix-ui";
import Spinner from "../../components/Spinner.tsx";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import ValueRequirementsList from "../../components/ValueRequirementsList.tsx";
import { useDocumentTitle } from "usehooks-ts";
import ErrorText from "../../components/ErrorText.tsx";
import { type SubmitHandler, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "react-toastify";

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPanel({
  navigateToRegister,
}: {
  navigateToRegister: () => void;
}) {
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  const {
    register,
    trigger,
    getValues,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const onLoginSubmit: SubmitHandler<LoginFormValues> = async (
    data: LoginFormValues,
  ): Promise<void> => {
    try {
      const response: ServiceResponse<LoginResponse> = await authService.login(
        data as LoginRequest,
      );

      if (response.statusCode === HttpStatusCode.Ok) {
        await revalidator.revalidate();

        navigate("/lobby");
        return;
      }

      if (
        response.statusCode === HttpStatusCode.BadRequest &&
        response.error?.code === "ValidationErrorsOccurred"
      ) {
        Object.entries(
          response.error.details as Record<string, string[]>,
        ).forEach(([field, messages]) => {
          setError(field as keyof LoginFormValues, {
            message: (messages as string[])[0],
          });
        });
        return;
      }

      await revalidator.revalidate();
      setError("root", {
        message: response.error?.message ?? "Unknown error.",
      });
    } catch {
      setError("root", { message: "An unexpected error occurred." });
    }
  };

  const [isRequestingPasswordResetEmail, setIsRequestingPasswordResetEmail] =
    useState(false);

  const onForgotPassword = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    clearErrors("root");

    const isEmailValid = await trigger("email");
    if (!isEmailValid) return;

    const email = getValues("email");
    setIsRequestingPasswordResetEmail(true);

    try {
      await authService.forgotPassword(email);
      toast.success("A password reset email has been sent.");
    } catch {
      toast.error(
        "Failed to request password reset email. Please try again later.",
      );
    } finally {
      setIsRequestingPasswordResetEmail(false);
    }
  };

  return (
    <div className="relative w-full overflow-visible rounded-3xl bg-gray-700 text-white shadow-xl">
      <div className="absolute h-12 w-full overflow-hidden rounded-t-3xl">
        <div className="panel-accent-color-1 h-1"></div>
      </div>

      <section className="p-10">
        <h1 className="text-center text-3xl font-bold text-white">
          Welcome Back
        </h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          Identify yourself
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={handleSubmit(onLoginSubmit)}
          onChange={() => clearErrors("root")}
        >
          <div>
            <Label.Root className="label mb-1 block">Email</Label.Root>

            <input
              type="email"
              placeholder="Enter Email"
              className="input-field h-10 w-full px-3"
              {...register("email")}
            />

            {errors.email && (
              <ErrorText className="mt-1">{errors.email.message}</ErrorText>
            )}
          </div>

          <div>
            <Label.Root className="label mb-1 block">Password</Label.Root>

            <PasswordToggleField.Root>
              <div className="flex w-full flex-nowrap">
                <PasswordToggleField.Input
                  placeholder="Enter Password"
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

            {errors.password && (
              <ErrorText className="mt-1">{errors.password.message}</ErrorText>
            )}
          </div>

          {errors.root && (
            <ErrorText className="mt-1 block text-center">
              {errors.root.message}
            </ErrorText>
          )}

          <div className="flex flex-row items-center justify-center">
            <button
              type="button"
              disabled={isRequestingPasswordResetEmail}
              className="mt-2 block cursor-pointer text-center text-sm text-gray-400 transition-colors hover:text-indigo-400 disabled:text-gray-600 disabled:select-none"
              onClick={onForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            name="intent"
            value="login"
            disabled={isSubmitting}
            className="button-color-1 mt-4 flex h-11 w-full cursor-pointer flex-row items-center justify-center rounded-lg font-semibold text-white shadow-md transition-colors duration-300"
          >
            {isSubmitting ? (
              <Spinner className="size-6 fill-white" />
            ) : (
              <p>Log In</p>
            )}
          </button>
        </form>

        <p className="mt-2 text-center text-sm text-gray-400">
          No account? Click{" "}
          <button
            className="cursor-pointer border-none bg-none underline"
            onClick={() => {
              navigateToRegister();
              reset();
            }}
          >
            here
          </button>{" "}
          to create one.
        </p>
      </section>
    </div>
  );
}

const registerSchema = z
  .object({
    email: z.email(),
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

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPanel({ navigateToLogin }: { navigateToLogin: () => void }) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting, isSubmitSuccessful, isDirty },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const passwordValue = watch("password", "");

  const [hasModified, setHasModified] = useState(false);

  useEffect(() => {
    if (isSubmitSuccessful) {
      setHasModified(false);
    }
  }, [isSubmitSuccessful]);

  useEffect(() => {
    if (isDirty) {
      setHasModified(true);
    }
  }, [isDirty]);

  const onSubmit: SubmitHandler<RegisterFormValues> = async (
    data: RegisterFormValues,
  ): Promise<void> => {
    try {
      const response: ServiceResponse = await authService.register(
        data as RegisterRequest,
      );

      if (response.statusCode === HttpStatusCode.Created) {
        reset(data);
        return;
      }

      if (
        response.statusCode === HttpStatusCode.BadRequest &&
        response.error?.code === "ValidationErrorsOccurred"
      ) {
        Object.entries(
          response.error.details as Record<string, string[]>,
        ).forEach(([field, messages]) => {
          if (field === "password") {
            setError(field as keyof RegisterFormValues, {
              message: messages.join("\n"),
            });
          } else {
            setError(field as keyof RegisterFormValues, {
              message: messages[0],
            });
          }
        });

        return;
      }

      setError("root", {
        message: response.error?.message ?? "Unknown error.",
      });
    } catch {
      setError("root", { message: "An unexpected error occurred." });
    }
  };

  const showSuccess = isSubmitSuccessful && !hasModified;

  return (
    <div className="relative w-full overflow-visible rounded-3xl bg-gray-700 text-white shadow-xl">
      <div className="absolute h-12 w-full overflow-hidden rounded-t-3xl">
        <div className="panel-accent-color-1 h-1"></div>
      </div>

      <section className="p-10">
        <h1 className="text-center text-3xl font-bold text-white">Welcome</h1>
        <p className="mt-2 text-center text-sm text-gray-400">
          Hope you got drink
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={handleSubmit(onSubmit)}
          onChange={() => clearErrors("root")}
        >
          <div>
            <Label.Root className="label mb-1 block">Email</Label.Root>

            <input
              type="text"
              placeholder="Enter Email"
              className="input-field h-10 w-full px-3"
              {...register("email")}
            />

            {errors.email && (
              <ErrorText className="mt-1">{errors.email.message}</ErrorText>
            )}
          </div>

          <div>
            <Label.Root className="label mb-1 block">Password</Label.Root>

            <PasswordToggleField.Root>
              <div className="flex w-full flex-nowrap">
                <PasswordToggleField.Input
                  placeholder="Enter password"
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
                    errors.password?.message?.includes(
                      "one non alphanumeric",
                    ) || errors.password?.message?.includes("is required"),
                },
              ]}
              className="mt-2 grid grid-cols-2 gap-y-1"
            />
          </div>

          <div>
            <Label.Root className="label mb-1 block">
              Confirm Password
            </Label.Root>

            <PasswordToggleField.Root>
              <div className="flex w-full flex-nowrap">
                <PasswordToggleField.Input
                  placeholder="Enter password (again)"
                  className="input-field mr-1 h-10 flex-1 px-3"
                  {...register("confirmPassword")}
                />

                <PasswordToggleField.Toggle className="input-field h-10 flex-none p-2">
                  <PasswordToggleField.Icon
                    visible={<BsEye className="size-6" />}
                    hidden={<BsEyeSlash className="size-6" />}
                  />
                </PasswordToggleField.Toggle>
              </div>
            </PasswordToggleField.Root>

            {errors.confirmPassword && (
              <ErrorText className="mt-1">
                {errors.confirmPassword.message}
              </ErrorText>
            )}
          </div>

          <button
            type="submit"
            name="intent"
            value="register"
            disabled={isSubmitting}
            className="button-color-1 mt-4 flex h-11 w-full cursor-pointer flex-row items-center justify-center rounded-lg font-semibold text-white shadow-md transition-colors duration-300"
          >
            {isSubmitting ? (
              <Spinner className="size-6 fill-white" />
            ) : (
              <p>Register</p>
            )}
          </button>
        </form>

        {showSuccess && (
          <span className="mt-2 block text-center text-sm text-green-500">
            Account created, please wait for confirmation mail.
          </span>
        )}

        {errors.root && (
          <ErrorText className="mt-1 block text-center">
            {errors.root.message}
          </ErrorText>
        )}

        <p className="mt-2 text-center text-sm text-gray-400">
          Already got an account? Click{" "}
          <button
            className="cursor-pointer border-none bg-none underline"
            onClick={() => {
              navigateToLogin();
              reset();
            }}
          >
            here
          </button>{" "}
          to login.
        </p>
      </section>
    </div>
  );
}

export default function AuthenticatePage() {
  useDocumentTitle("Conflux - Authenticate");

  const location = useLocation();
  const navigate = useNavigate();

  const [isOnLoginSide, setIsOnLoginSide] = useState(
    location.hash !== "#register",
  );

  useEffect(() => {
    setIsOnLoginSide(location.hash !== "#register");
  }, [location.hash]);

  const gradientElementRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gradientAnimations = useRef<JSAnimation[]>([]);

  const cardInnerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    gradientAnimations.current = gradientElementRefs.current.map((element) => {
      if (!element) return null!;

      const startX = random(-50, 50);
      const startY = random(-50, 50);
      const radiusX = random(15, 45);
      const radiusY = random(15, 45);
      const duration = random(8000, 15000);
      const direction = random(0, 1) === 1 ? 1 : -1;
      const initialAngle = random(0, Math.PI * 2);

      return animate(element, {
        x: {
          from: "0%",
          to: "360%",
          modifier: (v) =>
            Math.cos(((v * Math.PI) / 180) * direction + initialAngle) *
              radiusX +
            startX,
        },
        y: {
          from: "0%",
          to: "360%",
          modifier: (v) =>
            Math.sin((v * Math.PI) / 180 + initialAngle) * radiusY + startY,
        },
        ease: "linear",
        duration: duration,
        loop: true,
        autoplay: true,
      });
    });

    return () => {
      for (const animation of gradientAnimations.current) {
        animation.revert();
      }
    };
  }, []);

  useEffect(() => {
    if (cardInnerRef.current) {
      // Prevent the animation from firing on mounting phase
      if (isFirstRender.current) {
        isFirstRender.current = false;
        cardInnerRef.current.style.transform = `rotateY(${isOnLoginSide ? 0 : 180}deg)`;
        return;
      }

      animate(cardInnerRef.current, {
        rotateY: isOnLoginSide ? 0 : 180,
        duration: 300,
        ease: "easeInOutQuad",
      });
    }
  }, [isOnLoginSide]);

  return (
    <>
      {/* Background */}
      <div className="morph-gradient-bg fixed inset-0 bg-fixed">
        <svg xmlns="http://www.w3.org/2000/svg" className="size-0">
          <defs>
            <filter id="filter">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="10"
                result="blur"
              />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0   0 1 0 0 0   0 0 1 0 0   0 0 0 18 -8"
                result="bg"
              />
              <feBlend in="SourceGraphic" in2="bg" />
            </filter>
          </defs>
        </svg>

        <div className="morph-gradient-container">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={`gradient-element-${index + 1}`}
              ref={(el) => {
                gradientElementRefs.current[index] = el;
              }}
            />
          ))}
        </div>
      </div>

      {/* Login/Registeration Card */}
      <div className="flex h-dvh w-dvw flex-col items-center justify-center overflow-hidden px-4 sm:px-0">
        {/* Card flipping container */}
        <div className="relative w-full perspective-distant sm:w-lg lg:w-xl">
          <div
            ref={cardInnerRef}
            className="relative grid w-full items-center transform-3d"
          >
            {/* Front Face (Login) */}
            <div
              className={`col-start-1 row-start-1 w-full backface-hidden ${!isOnLoginSide ? "pointer-events-none" : ""}`}
            >
              <LoginPanel
                navigateToRegister={() =>
                  navigate("#register", { replace: true })
                }
              />
            </div>

            {/* Back Face (Register) */}
            <div
              className={`col-start-1 row-start-1 w-full rotate-y-180 backface-hidden ${isOnLoginSide ? "pointer-events-none" : ""}`}
            >
              <RegisterPanel
                navigateToLogin={() => navigate("#login", { replace: true })}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
