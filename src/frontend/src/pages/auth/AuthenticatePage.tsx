import {useEffect, useRef, useState} from "react";
import {animate, JSAnimation, random} from "animejs";
import {Form, redirect, useActionData, useLocation, useNavigate, useNavigation} from "react-router";
import {authService} from "../../api/authService.ts";
import type {LoginResponse, ServiceError, ServiceResponse} from "../../api/responses.ts";
import {HttpStatusCode} from "axios";
import {Label, Separator, unstable_PasswordToggleField as PasswordToggleField} from "radix-ui";
import Spinner from "../../components/Spinner.tsx";
import {BsEye, BsEyeSlash} from "react-icons/bs";
import ValueRequirementsList from "../../components/ValueRequirementsList.tsx";
import {useDocumentTitle} from "usehooks-ts";

type ActionData = {
  intent: "login" | "register";
  error: string;
  validationErrorDetails?: Record<string, string[]>;
}

export async function authAction({request}: { request: Request }): Promise<Response | ActionData> {
  const formData: FormData = await request.formData();

  const email = formData.get("email");
  const password = formData.get("password");

  const intent = formData.get("intent") as "login" | "register";

  switch (intent) {
    case "login": {
      const response: ServiceResponse<LoginResponse> = await authService.login({
        email: email as string,
        password: password as string
      })

      if (response.statusCode === HttpStatusCode.Ok) {
        return redirect("/lobby");
      }

      return {
        intent: "login",
        error: response.error?.message ?? "Unknown error.",
        validationErrorDetails:
          response.statusCode === HttpStatusCode.BadRequest && response.error?.code === "ValidationErrorsOccurred" ?
            response.error.details as Record<string, string[]> :
            undefined,
      };
    }

    case "register": {
      const confirmPassword = formData.get("confirmPassword") as string;

      if (password !== confirmPassword) {
        return {error: "Passwords do not match.", intent: "register"}
      }

      const response: ServiceResponse = await authService.register({
        email: email as string,
        password: password as string,
        confirmPassword: confirmPassword,
      });

      if (response.statusCode === HttpStatusCode.Created) {
        return redirect("/auth#login");
      }

      return {
        intent: "register",
        error: response.error?.message ?? "Unknown error.",
        validationErrorDetails:
          response.statusCode === HttpStatusCode.BadRequest && response.error?.code === "ValidationErrorsOccurred" ?
            response.error.details as Record<string, string[]> :
            undefined,
      };
    }
  }
}

function LoginPanel({navigateToRegister}: { navigateToRegister: () => void }) {
  const navigation = useNavigation();
  const actionData = useActionData() as ActionData;

  const isLoggingIn = navigation.state === "submitting" && navigation.formData?.get("intent") === "login";

  const [errorMessage, setErrorMessage] = useState<string | undefined>(actionData?.intent === "login" ? actionData?.error : undefined);

  useEffect(() => {
    if (actionData?.intent === "login") {
      setErrorMessage(actionData.error);
    }
  }, [actionData]);

  const handleInputChanged = () => {
    setErrorMessage(undefined);
  }

  return (
    <div className="bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-visible relative">
      <div className="absolute rounded-t-3xl h-12 w-full overflow-hidden">
        <div className="h-1 panel-accent-color-1"></div>
      </div>

      <section className="p-10">
        <h1 className="text-center font-bold text-3xl text-white">Welcome Back</h1>
        <p className="text-center text-gray-400 text-sm mt-2">Identify yourself</p>

        <Form className="mt-5" name="login" method="post" action="/auth?index#login">
          <div>
            <Label.Root className="text-sm text-gray-300 mb-2 block" htmlFor="login_email">Email</Label.Root>

            <input
              type="email"
              id="login_email"
              name="email"
              placeholder="Enter Email"
              className="w-full h-11 px-3 input-field"
              required aria-required
              onChange={handleInputChanged}
            />
          </div>

          <div className="mt-4">
            <Label.Root className="text-sm text-gray-300 mb-2 block" htmlFor="login_password">Password</Label.Root>

            <PasswordToggleField.Root>
              <div className="flex flex-nowrap w-full">
                <PasswordToggleField.Input
                  id="login_password"
                  placeholder="Enter Password"
                  name="password"
                  className="flex-1 h-11 px-3 input-field mr-1"
                  required aria-required
                  onChange={handleInputChanged}
                />
                <PasswordToggleField.Toggle className="flex-none h-11 p-2 input-field">
                  <PasswordToggleField.Icon visible={<BsEye className="size-6"/>}
                                            hidden={<BsEyeSlash className="size-6"/>}/>
                </PasswordToggleField.Toggle>
              </div>
            </PasswordToggleField.Root>
          </div>

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
            disabled={isLoggingIn}
            className="w-full h-11 button-color-1 rounded-lg text-white font-semibold shadow-md transition-colors duration-300 mt-4 cursor-pointer flex flex-row justify-center items-center"
          >
            {isLoggingIn ? <Spinner className="size-6 fill-white"/> : <p>Log In</p>}
          </button>
        </Form>

        {errorMessage && (
          <p className="text-sm text-center mt-1 text-red-500">{errorMessage}</p>
        )}

        <p className="text-center text-gray-400 text-sm mt-2">
          No account? Click <button className="underline cursor-pointer bg-none border-none"
                                    onClick={navigateToRegister}>here</button> to create one.
        </p>
      </section>
    </div>
  );
}

function RegisterPanel({navigateToLogin}: { navigateToLogin: () => void }) {
  const navigation = useNavigation();
  const actionData = useActionData() as ActionData;

  const isRegistering =
    navigation.state === "submitting" && navigation.formData?.get("intent") === "register";

  const [password, setPassword] = useState("");

  const [validationErrors, setValidationErrors] = useState(actionData?.intent === "register" ? actionData.validationErrorDetails : undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(actionData?.intent === "register" ? actionData?.error : undefined);

  useEffect(() => {
    if (actionData?.intent === "register") {
      setValidationErrors(actionData.validationErrorDetails);
      setErrorMessage(actionData.error);
    }
  }, [actionData]);

  const handleInputChange = (field?: string) => {
    setErrorMessage(undefined); // Clear global error (e.g. "Passwords do not match")

    if (validationErrors && field) {
      setValidationErrors((prev) => {
        if (!prev) return prev;

        const updated = {...prev};
        delete updated[field];
        return updated;
      });
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

        <Form className="mt-5" name="register" method="post" action="/auth?index#register">
          <div>
            <Label.Root className="text-sm text-gray-300 block mb-2" htmlFor="register_email">Email</Label.Root>

            <input type="text"
                   id="register_email"
                   placeholder="Enter Email"
                   name="email"
                   className="w-full h-11 px-3 input-field"
                   required
                   aria-required
                   onChange={() => handleInputChange("email")}
            />

            {validationErrors?.["email"] && (
              <p className="text-sm mt-1 text-red-500">{validationErrors["email"][0]}</p>
            )}
          </div>

          <div className="mt-4">
            <Label.Root className="text-sm text-gray-300 block mb-2" htmlFor="register_password">Password</Label.Root>

            <PasswordToggleField.Root>
              <div className="flex flex-nowrap w-full">
                <PasswordToggleField.Input
                  id="register_password"
                  placeholder="Enter Password"
                  name="password"
                  className="flex-1 h-11 px-3 input-field mr-1"
                  required aria-required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handleInputChange("password");
                  }}
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
              value={password}
              rules={[
                {
                  label: "At least 8 characters",
                  fulfilled: password.length >= 8,
                  error: validationErrors?.["password"]?.some((errorMessage) => errorMessage.includes("must be at least")),
                },
                {
                  label: "Contain uppercase",
                  fulfilled: /\p{Lu}/u.test(password),
                  error: validationErrors?.["password"]?.some((errorMessage) => errorMessage.includes("one uppercase")),
                },
                {
                  label: "Contain numerical",
                  fulfilled: /\p{N}/u.test(password),
                  error: validationErrors?.["password"]?.some((errorMessage) => errorMessage.includes("one digit")),
                },
                {
                  label: "Contain special",
                  fulfilled: /[^\p{L}\p{N}]/u.test(password),
                  error: validationErrors?.["password"]?.some((errorMessage) => errorMessage.includes("one non alphanumeric")),
                },
              ]}
              className="grid grid-cols-2 gap-y-1 mt-2"
            />
          </div>

          <div className="mt-4">
            <Label.Root className="text-sm text-gray-300 block mb-2" htmlFor="register_confirm_password">Confirm
              Password</Label.Root>

            <PasswordToggleField.Root>
              <div className="flex flex-nowrap w-full">
                <PasswordToggleField.Input
                  id="register_confirm_password"
                  placeholder="Enter Password (Again)"
                  name="confirmPassword"
                  className="flex-1 h-11 px-3 input-field mr-1"
                  required aria-required
                  onChange={() => handleInputChange()}
                />
                <PasswordToggleField.Toggle className="flex-none h-11 p-2 input-field">
                  <PasswordToggleField.Icon
                    visible={<BsEye className="size-6"/>}
                    hidden={<BsEyeSlash className="size-6"/>}
                  />
                </PasswordToggleField.Toggle>
              </div>
            </PasswordToggleField.Root>
          </div>

          <button
            type="submit"
            name="intent"
            value="register"
            disabled={isRegistering}
            className="w-full h-11 button-color-1 rounded-lg text-white font-semibold shadow-md transition-colors duration-300 mt-4 cursor-pointer flex flex-row justify-center items-center"
          >
            {isRegistering ? <Spinner className="size-6 fill-white"/> : <p>Register</p>}
          </button>
        </Form>

        {errorMessage && !actionData.validationErrorDetails && (
          <p className="text-sm text-center mt-1 text-red-500">{errorMessage}</p>
        )}

        <p className="text-center text-gray-400 text-sm mt-2">
          Already got an account? Click <button className="underline cursor-pointer bg-none border-none"
                                                onClick={navigateToLogin}>here</button> to login.
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