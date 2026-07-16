import { useEffect, useRef, useState } from "react";
import { animate, random, JSAnimation } from "animejs";
import {Form, useLocation, redirect, useActionData, useNavigation } from "react-router-dom";
import { authService } from "../../api/authService.ts";
import type { LoginResponse } from "../../api/responses.ts";
import { HttpStatusCode } from "axios";
import { Label, unstable_PasswordToggleField as PasswordToggleField } from "radix-ui";
import Spinner from "../../components/Spinner.tsx";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import type { ApiResponse } from "../../api/apiResponse.ts";

export async function authLoader(){
    if (authService.hasAuthorizationInfo()) {
        return redirect("/");
    }

    try {
        const response = await authService.refresh();
        if (response.statusCode === HttpStatusCode.Ok) {
            return redirect("/");
        }
    } catch (error) {
        return null; // refresh failed, let user see the auth page.
    }

    return null; // also refresh failed
}

export async function authAction({ request }: { request: Request }) {
    const formData: FormData = await request.formData();

    const email = formData.get("email");
    const password = formData.get("password");

    if (!email) {
        return { message: "Email is required." }
    }

    if (!password) {
        return { message: "Password is required." }
    }

    switch (formData.get("intent")) {
        case "login": {
            const response: ApiResponse<LoginResponse> = await authService.login({
                email: email as string,
                password: password as string
            })

            if (response.statusCode === HttpStatusCode.Ok) {
                return redirect("/lobby");

                // const isEmailConfirmed: boolean =
                //     response.data?.authorization.permissions.includes("EMAIL_CONFIRMED") ?? false;
                //
                // const isProfileSetup: boolean =
                //     response.data?.authorization.permissions.includes("PROFILE_SETUP") ?? false;
                //
                // return redirect(!isEmailConfirmed ? "/auth/verify-email" : !isProfileSetup ? "/profile-setup" : "/");
            }

            return { error: response.message ?? "Unknown error." };
        }

        case "register": {
            const confirmPassword = formData.get("confirmPassword") as string;

            if (password !== confirmPassword) {
                return { error: "Passwords do not match." }
            }

            const response = await authService.register({
                email: email as string,
                password: password as string,
                confirmPassword: confirmPassword,
            });

            if (response.statusCode === HttpStatusCode.Created) {
                return redirect("/auth#login");
            }

            return { error: response.message ?? "Unknown error." };
        }

        default:
            return { error: "Unknown intent." };
    }
}

function LoginPanel({ navigateToRegister }: { navigateToRegister: () => void }) {
    const navigation = useNavigation();
    const actionData = useActionData() as { error?: string };

    const isLoggingIn = navigation.state === "submitting" && navigation.formData?.get("intent") === "login";

    return (
        <div className="bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-visible relative">
            <div className="absolute rounded-t-3xl h-12 w-full overflow-hidden">
                <div className="h-1 panel-accent-color-1"></div>
            </div>

            <section className="p-10">
                <h1 className="text-center font-bold text-3xl text-white">Welcome Back</h1>
                <p className="text-center text-gray-400 text-sm mt-2">Identify yourself</p>

                <Form className="mt-8" name="login" method="post">
                    <div>
                        <Label.Root className="text-sm text-gray-300 mb-2 block" htmlFor="login_email">Email</Label.Root>

                        <input id="login_email" type="text" placeholder="Enter Email" name="email"
                               className="w-full h-11 px-3 input-field"/>
                    </div>

                    <div className="mt-4">
                        <Label.Root className="text-sm text-gray-300 mb-2 block" htmlFor="login_password">Password</Label.Root>

                        <PasswordToggleField.Root>
                            <div className="flex flex-nowrap w-full">
                                <PasswordToggleField.Input
                                    id="login_password"
                                    placeholder="Enter Password"
                                    name="password"
                                    className="flex-1 h-11 px-3 input-field mr-1"/>
                                <PasswordToggleField.Toggle className="flex-none h-11 p-2 input-field">
                                    <PasswordToggleField.Icon visible={<BsEye className="size-6"/>} hidden={<BsEyeSlash className="size-6"/>}/>
                                </PasswordToggleField.Toggle>
                            </div>
                        </PasswordToggleField.Root>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-400 mt-4">
                        <a href="#" className="hover:text-indigo-400 transition-colors">Forgot password?</a>
                    </div>

                    <button
                        type="submit"
                        name="intent"
                        value="login"
                        disabled={isLoggingIn}
                        className="w-full h-11 button-color-1 rounded-lg text-white font-semibold shadow-md transition-colors duration-300 mt-4 cursor-pointer flex flex-row justify-center items-center"
                    >
                        { isLoggingIn ? <Spinner className="size-6 fill-white"/> : <p>Log In</p> }
                    </button>
                </Form>

                {actionData && actionData.error && actionData.error.length > 0 && (
                    <p className="text-center mt-1 text-red-500">{actionData.error}</p>
                ) }

                <p className="text-center text-gray-400 text-sm mt-2">
                    No account? Click <button className="underline cursor-pointer bg-none border-none" onClick={navigateToRegister}>here</button> to create one.
                </p>

                <p className="text-center text-gray-400 text-sm mt-1">
                    Or you can login with...

                    <span className="flex flex-row gap-2 flex-wrap justify-center mt-2">
                        <a href="#">
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-6 fill-white" viewBox="0 0 16 16">
                                <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z"/>
                            </svg>
                        </a>
                    </span>
                </p>
            </section>
        </div>
    );
}

function RegisterPanel({ navigateToLogin }: { navigateToLogin: () => void }) {
    const navigation = useNavigation();
    const actionData = useActionData() as { error?: string };

    const isRegistering = navigation.state === "submitting" && navigation.formData?.get("intent") === "login";

    return (
        <div className="bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-visible relative">
            <div className="absolute rounded-t-3xl h-12 w-full overflow-hidden">
                <div className="h-1 panel-accent-color-1"></div>
            </div>

            <section className="p-10">
                <h1 className="text-center font-bold text-3xl text-white">Welcome</h1>
                <p className="text-center text-gray-400 text-sm mt-2">Hope you got drink</p>

                <Form className="mt-8" name="register" method="post">
                    <div>
                        <Label.Root className="text-sm text-gray-300 block mb-2" htmlFor="register_email">Email</Label.Root>

                        <input id="register_email" type="text" placeholder="Enter Email" name="email"
                               className="w-full h-11 px-3 input-field"/>
                    </div>

                    <div className="mt-4">
                        <Label.Root className="text-sm text-gray-300 block mb-2" htmlFor="register_password">Password</Label.Root>

                        <PasswordToggleField.Root>
                            <div className="flex flex-nowrap w-full">
                                <PasswordToggleField.Input
                                    id="register_password"
                                    placeholder="Enter Password"
                                    name="password"
                                    className="flex-1 h-11 px-3 input-field mr-1"/>
                                <PasswordToggleField.Toggle className="flex-none h-11 p-2 input-field">
                                    <PasswordToggleField.Icon visible={<BsEye className="size-6"/>} hidden={<BsEyeSlash className="size-6"/>}/>
                                </PasswordToggleField.Toggle>
                            </div>
                        </PasswordToggleField.Root>
                    </div>

                    <div className="mt-4">
                        <Label.Root className="text-sm text-gray-300 block mb-2" htmlFor="register_confirm_password">Confirm Password</Label.Root>

                        <PasswordToggleField.Root>
                            <div className="flex flex-nowrap w-full">
                                <PasswordToggleField.Input
                                    id="register_confirm_password"
                                    placeholder="Enter Password (Again)"
                                    name="confirmPassword"
                                    className="flex-1 h-11 px-3 input-field mr-1"/>
                                <PasswordToggleField.Toggle className="flex-none h-11 p-2 input-field">
                                    <PasswordToggleField.Icon visible={<BsEye className="size-6"/>} hidden={<BsEyeSlash className="size-6"/>}/>
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
                        { isRegistering ? <Spinner className="size-6 fill-white"/> : <p>Register</p> }
                    </button>
                </Form>

                {actionData && actionData.error && actionData.error.length > 0 && (
                    <p className="text-center mt-1 text-red-500">{actionData.error}</p>
                ) }

                <p className="text-center text-gray-400 text-sm mt-2">
                    Already got an account? Click <button className="underline cursor-pointer bg-none border-none" onClick={navigateToLogin}>here</button> to login.
                </p>

                <p className="text-center text-gray-400 text-sm mt-1">
                    Or you can register with...

                    <span className="flex flex-row gap-2 flex-wrap justify-center mt-2">
                        <a href="#">
                            <svg xmlns="http://www.w3.org/2000/svg" className="size-6 fill-white" viewBox="0 0 16 16">
                                <path d="M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z"/>
                            </svg>
                        </a>
                    </span>
                </p>
            </section>
        </div>
    );
}

export default function AuthenticatePage() {
    const location = useLocation();
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
            { /* Background */ }
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

            { /* Login/Registeration Card */ }
            <div className="w-dvw h-dvh grid grid-cols-12 px-4 sm:px-0">
                <div className="col-start-1 col-span-12 sm:col-start-2 sm:col-span-10 md:col-start-3 md:col-span-8 lg:col-start-4 lg:col-span-6 xl:col-start-5 xl:col-span-4">
                    <div className="size-full flex flex-row justify-center items-center">
                        { /* Card flipping container */ }
                        <div className="w-full relative perspective-distant">
                            <div ref={cardInnerRef}
                                className="w-full transform-3d relative grid items-center"
                            >
                                {/* Front Face (Login) */}
                                <div className={`w-full col-start-1 row-start-1 backface-hidden ${!isOnLoginSide ? 'pointer-events-none' : ''}`}>
                                    <LoginPanel navigateToRegister={() => setIsOnLoginSide(false)} />
                                </div>

                                {/* Back Face (Register) */}
                                <div className={`w-full col-start-1 row-start-1 backface-hidden rotate-y-180 ${isOnLoginSide ? 'pointer-events-none' : ''}`}>
                                    <RegisterPanel navigateToLogin={() => setIsOnLoginSide(true)} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}