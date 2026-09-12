import {useEffect, useRef, useState} from "react";
import {animate, JSAnimation, random} from "animejs";
import {useLocation, useNavigate, useRevalidator} from "react-router";
import {authService} from "../../api/authService.ts";
import type {LoginRequest, LoginResponse, RegisterRequest, ServiceResponse} from "../../api/types.ts";
import {HttpStatusCode} from "axios";
import {Label, unstable_PasswordToggleField as PasswordToggleField} from "radix-ui";
import Spinner from "../../components/Spinner.tsx";
import {BsEye, BsEyeSlash} from "react-icons/bs";
import ValueRequirementsList from "../../components/ValueRequirementsList.tsx";
import {useDocumentTitle} from "usehooks-ts";
import ErrorText from "../../components/ErrorText.tsx";
import {type SubmitHandler, useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginPanel({navigateToRegister}: { navigateToRegister: () => void }) {
  const revalidator = useRevalidator();
  const navigate = useNavigate();

  const {
    register,
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

  const onSubmit: SubmitHandler<LoginFormValues> = async (data: LoginFormValues): Promise<void> => {
    try {
      const response: ServiceResponse<LoginResponse> = await authService.login(data as LoginRequest);

      if (response.statusCode === HttpStatusCode.Ok) {
        await revalidator.revalidate();

        navigate("/lobby");
        return;
      }

      if (response.statusCode === HttpStatusCode.BadRequest && response.error?.code === "ValidationErrorsOccurred") {
        Object.entries(response.error.details as Record<string, string[]>).forEach(([field, messages]) => {
          setError(field as keyof LoginFormValues, { message: (messages as string[])[0] });
        });
        return;
      }

      await revalidator.revalidate();
      setError("root", { message: response.error?.message ?? "Unknown error." });
    } catch (err) {
      setError("root", { message: "An unexpected error occurred." });
    }
  };

  return (
    <div className="bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-visible relative">
      <div className="absolute rounded-t-3xl h-12 w-full overflow-hidden">
        <div className="h-1 panel-accent-color-1"></div>
      </div>

      <section className="p-10">
        <h1 className="text-center font-bold text-3xl text-white">Welcome Back</h1>
        <p className="text-center text-gray-400 text-sm mt-2">Identify yourself</p>

        <form className="mt-5" onSubmit={handleSubmit(onSubmit)} onChange={() => clearErrors("root")}>
          <div>
            <Label.Root className="label mb-1 block" htmlFor="login_email">Email</Label.Root>

            <input
              type="email"
              id="login_email"
              placeholder="Enter Email"
              className="w-full h-11 px-3 input-field"
              aria-required
              {...register("email")}
            />

            {errors.email && (
              <ErrorText className="mt-1">{errors.email.message}</ErrorText>
            )}
          </div>

          <div className="mt-4">
            <Label.Root className="label mb-1 block" htmlFor="login_password">Password</Label.Root>

            <PasswordToggleField.Root>
              <div className="flex flex-nowrap w-full">
                <PasswordToggleField.Input
                  id="login_password"
                  placeholder="Enter Password"
                  className="flex-1 h-11 px-3 input-field mr-1"
                  aria-required
                  {...register("password")}
                />
                <PasswordToggleField.Toggle className="flex-none h-11 p-2 input-field">
                  <PasswordToggleField.Icon visible={<BsEye className="size-6"/>}
                                            hidden={<BsEyeSlash className="size-6"/>}/>
                </PasswordToggleField.Toggle>
              </div>
            </PasswordToggleField.Root>

            {errors.password && (
              <ErrorText className="mt-1">{errors.password.message}</ErrorText>
            )}
          </div>

          {errors.root && (
            <ErrorText className="block text-center mt-1">{errors.root.message}</ErrorText>
          )}

          <a
            href="#"
            className="mt-2 block text-center text-sm text-gray-400 hover:text-indigo-400 transition-colors"
          >
            Forgot password?
          </a>

          <button
            type="submit"
            name="intent"
            value="login"
            disabled={isSubmitting}
            className="w-full h-11 button-color-1 rounded-lg text-white font-semibold shadow-md transition-colors duration-300 mt-4 cursor-pointer flex flex-row justify-center items-center"
          >
            {isSubmitting ? <Spinner className="size-6 fill-white"/> : <p>Log In</p>}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-2">
          No account? Click{" "}
          <button className="underline cursor-pointer bg-none border-none" onClick={() => {
            navigateToRegister();
            reset();
          }}>
            here
          </button>{" "}
          to create one.
        </p>
      </section>
    </div>
  );
}

const registerSchema = z.object({
  email: z.email(),
  password: z.string(),
  confirmPassword: z.string(),
}).superRefine(({ password, confirmPassword }, ctx) => {
  if (confirmPassword !== password) {
    ctx.addIssue({
      code: "custom",
      message: "Passwords are mismatch.",
      path: ['confirmPassword']
    });
  }
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterPanel({navigateToLogin}: { navigateToLogin: () => void }) {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    reValidateMode: "onSubmit",
  });

  const passwordValue = watch("password", "");

  const onSubmit: SubmitHandler<RegisterFormValues> = async (data: RegisterFormValues): Promise<void> => {
    try {
      const response = await authService.register(data as RegisterRequest);

      if (response.statusCode === HttpStatusCode.Created) {
        navigateToLogin();
        reset();

        return;
      }

      if (response.statusCode === HttpStatusCode.BadRequest && response.error?.code === "ValidationErrorsOccurred") {
        Object.entries(response.error.details as Record<string, string[]>).forEach(([field, messages]) => {
          if (field === "password") {
            setError(field as keyof RegisterFormValues, { message: messages.join('\n') });
          } else {
            setError(field as keyof RegisterFormValues, { message: messages[0] });
          }
        });

        return;
      }

      setError("root", { message: response.error?.message ?? "Unknown error." });
    } catch (err) {
      setError("root", { message: "An unexpected error occurred." });
    }
  };

  return (
    <div className="bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-visible relative">
      <div className="absolute rounded-t-3xl h-12 w-full overflow-hidden">
        <div className="h-1 panel-accent-color-1"></div>
      </div>

      <section className="p-10">
        <h1 className="text-center font-bold text-3xl text-white">Welcome</h1>
        <p className="text-center text-gray-400 text-sm mt-2">Hope you got drink</p>

        <form className="mt-5" onSubmit={handleSubmit(onSubmit)} onChange={() => clearErrors("root")}>
          <div>
            <Label.Root className="label block mb-1" htmlFor="register_email">Email</Label.Root>

            <input type="text"
                   id="register_email"
                   placeholder="Enter Email"
                   className="w-full h-11 px-3 input-field"
                   aria-required
                   {...register("email")}
            />

            {errors.email && (
              <ErrorText className="mt-1">{errors.email.message}</ErrorText>
            )}
          </div>

          <div className="mt-4">
            <Label.Root className="label block mb-1" htmlFor="register_password">Password</Label.Root>

            <PasswordToggleField.Root>
              <div className="flex flex-nowrap w-full">
                <PasswordToggleField.Input
                  id="register_password"
                  placeholder="Enter Password"
                  className="flex-1 h-11 px-3 input-field mr-1"
                  aria-required
                  {...register("password")}
                />

                <PasswordToggleField.Toggle className="flex-none h-11 p-2 input-field">
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
                  fulfilled: passwordValue.length >= 8,
                  error: errors.password?.message?.includes("must be at least") || errors.password?.message?.includes("is required"),
                },
                {
                  label: "Contain uppercase",
                  fulfilled: /\p{Lu}/u.test(passwordValue),
                  error: errors.password?.message?.includes("one uppercase") || errors.password?.message?.includes("is required"),
                },
                {
                  label: "Contain numerical",
                  fulfilled: /\p{N}/u.test(passwordValue),
                  error: errors.password?.message?.includes("one digit") || errors.password?.message?.includes("is required"),
                },
                {
                  label: "Contain special",
                  fulfilled: /[^\p{L}\p{N}]/u.test(passwordValue),
                  error: errors.password?.message?.includes("one non alphanumeric") || errors.password?.message?.includes("is required"),
                },
              ]}
              className="grid grid-cols-2 gap-y-1 mt-2"
            />
          </div>

          <div className="mt-4">
            <Label.Root className="label block mb-1" htmlFor="register_confirm_password">Confirm
              Password</Label.Root>

            <PasswordToggleField.Root>
              <div className="flex flex-nowrap w-full">
                <PasswordToggleField.Input
                  id="register_confirm_password"
                  placeholder="Enter Password (Again)"
                  className="flex-1 h-11 px-3 input-field mr-1"
                  aria-required
                  {...register("confirmPassword")}
                />
                <PasswordToggleField.Toggle className="flex-none h-11 p-2 input-field">
                  <PasswordToggleField.Icon
                    visible={<BsEye className="size-6"/>}
                    hidden={<BsEyeSlash className="size-6"/>}
                  />
                </PasswordToggleField.Toggle>
              </div>
            </PasswordToggleField.Root>

            {errors.confirmPassword && (
              <ErrorText className="mt-1">{errors.confirmPassword.message}</ErrorText>
            )}
          </div>

          <button
            type="submit"
            name="intent"
            value="register"
            disabled={isSubmitting}
            className="w-full h-11 button-color-1 rounded-lg text-white font-semibold shadow-md transition-colors duration-300 mt-4 cursor-pointer flex flex-row justify-center items-center"
          >
            {isSubmitting ? <Spinner className="size-6 fill-white"/> : <p>Register</p>}
          </button>
        </form>

        {errors.root && (
          <ErrorText className="mt-1">{errors.root.message}</ErrorText>
        )}

        <p className="text-center text-gray-400 text-sm mt-2">
          Already got an account? Click{" "}
          <button className="underline cursor-pointer bg-none border-none" onClick={() => {
            navigateToLogin();
            reset();
          }}>
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

  const [isOnLoginSide, setIsOnLoginSide] = useState(location.hash !== "#register");

  useEffect(() => {
    setIsOnLoginSide(location.hash !== "#register");
  }, [location.hash]);

  const gradientElementRefs = useRef<(HTMLDivElement | null)[]>([]);
  const gradientAnimations = useRef<JSAnimation[]>([]);

  const cardInnerRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    gradientAnimations.current = gradientElementRefs.current.map(element => {
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
          from: '0%',
          to: '360%',
          modifier: v => Math.cos(v * Math.PI / 180 * direction + initialAngle) * radiusX + startX,
        },
        y: {
          from: '0%',
          to: '360%',
          modifier: v => Math.sin(v * Math.PI / 180 + initialAngle) * radiusY + startY,
        },
        ease: 'linear',
        duration: duration,
        loop: true,
        autoplay: true,
      });
    });

    return () => {
      for (const animation of gradientAnimations.current) {
        animation.revert();
      }
    }
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
        ease: 'easeInOutQuad'
      });
    }
  }, [isOnLoginSide]);

  return (
    <>
      { /* Background */}
      <div className="fixed bg-fixed inset-0 morph-gradient-bg">
        <svg xmlns="http://www.w3.org/2000/svg" className="size-0">
          <defs>
            <filter id="filter">
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
              <feColorMatrix in="blur" mode="matrix"
                             values="1 0 0 0 0   0 1 0 0 0   0 0 1 0 0   0 0 0 18 -8" result="bg"/>
              <feBlend in="SourceGraphic" in2="bg"/>
            </filter>
          </defs>
        </svg>

        <div className="morph-gradient-container">
          {Array.from({length: 5}).map((_, index) => (
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

      { /* Login/Registeration Card */}
      <div className="w-dvw h-dvh px-4 sm:px-0 flex flex-col justify-center items-center overflow-hidden">
        { /* Card flipping container */}
        <div className="w-full sm:w-lg lg:w-xl relative perspective-distant">
          <div ref={cardInnerRef}
               className="w-full transform-3d relative grid items-center"
          >
            {/* Front Face (Login) */}
            <div
              className={`w-full col-start-1 row-start-1 backface-hidden ${!isOnLoginSide ? 'pointer-events-none' : ''}`}>
              <LoginPanel navigateToRegister={() => navigate("#register", { replace: true })}/>
            </div>

            {/* Back Face (Register) */}
            <div
              className={`w-full col-start-1 row-start-1 backface-hidden rotate-y-180 ${isOnLoginSide ? 'pointer-events-none' : ''}`}>
              <RegisterPanel navigateToLogin={() => navigate("#login", { replace: true })}/>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}