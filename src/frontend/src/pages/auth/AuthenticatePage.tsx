import { useActionState, useEffect, useRef, useState } from "react";
import { animate, random, JSAnimation } from "animejs";
import { useLocation } from "react-router-dom";
import { authService } from "../../api/authService.ts";
import type { ApiResponse, LoginResponse } from "../../api/types/responses.ts";
import { HttpStatusCode } from "axios";

async function onLoginAction(_previousState: any, formData: FormData): Promise<ApiResponse<LoginResponse>> {
    const email = formData.get("email");
    const password = formData.get("password");

    if (!email) {
        return {
            statusCode: HttpStatusCode.BadRequest,
            message: "Email is required.",
            data: null,
        }
    }

    if (!password) {
        return {
            statusCode: HttpStatusCode.BadRequest,
            message: "Password is required.",
            data: null,
        }
    }

    const response: ApiResponse<LoginResponse> = await authService.login({
        email: email as string,
        password: password as string,
        remember: false,
    });

    console.log(JSON.stringify(response));

    return response;
}

function LoginPanel({ navigateToRegister }: { navigateToRegister: () => void }) {
    const [loginState, loginAction] = useActionState(onLoginAction, null);

    return (
        <div className="bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-visible relative">
            <div className="absolute rounded-t-3xl h-12 w-full overflow-hidden">
                <div className="h-1 panel-accent-color-1"></div>
            </div>

            <section className="p-10">
                <h1 className="text-center font-bold text-3xl text-white">Welcome Back</h1>
                <p className="text-center text-gray-400 text-sm mt-2">Identify yourself</p>

                <form className="mt-8" name="login" action={loginAction}>
                    <div>
                        <label className="text-sm text-gray-300">Email</label>

                        <input type="text" placeholder="Enter Email" name="email"
                               className="w-full h-11 mt-2 px-3 input-field"/>
                    </div>

                    <div className="mt-4">
                        <label className="text-sm text-gray-300">Password</label>

                        <input type="password" placeholder="Enter Password" name="password"
                               className="w-full h-11 mt-2 px-3 input-field"/>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-400 mt-4">
                        {/*<label className="flex items-center space-x-2">*/}
                        {/*    <input type="checkbox" name="remember" className="accent-indigo-500"/>*/}

                        {/*    <span>Remember me</span>*/}
                        {/*</label>*/}

                        <a href="#" className="hover:text-indigo-400 transition-colors">Forgot password?</a>
                    </div>

                    <button type="submit"
                            className="w-full h-11 button-color-1 rounded-lg text-white font-semibold shadow-md transition-colors duration-300 mt-4 cursor-pointer">
                        Log In
                    </button>
                </form>

                {loginState && loginState.message && loginState.message.length > 0 && (
                    <p className="text-center mt-1 text-red-500">{loginState.message}</p>
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

function onRegisterAction(_previousState: any, formData: FormData): ApiResponse {
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    console.log(email + ", " + password + ", " + confirmPassword);

    return { statusCode: 200, message: null }
}

function RegisterPanel({ navigateToLogin }: { navigateToLogin: () => void }) {
    const [registerState, registerAction] = useActionState(onRegisterAction, null);

    return (
        <div className="bg-gray-700 w-full rounded-3xl shadow-xl text-white overflow-visible relative">
            <div className="absolute rounded-t-3xl h-12 w-full overflow-hidden">
                <div className="h-1 panel-accent-color-1"></div>
            </div>

            <section className="p-10">
                <h1 className="text-center font-bold text-3xl text-white">Welcome</h1>
                <p className="text-center text-gray-400 text-sm mt-2">Hope you got drink</p>

                <form className="mt-8" name="register" action={registerAction}>
                    <div>
                        <label className="text-sm text-gray-300">Email</label>

                        <input type="text" placeholder="Enter Email" name="email"
                               className="w-full h-11 mt-2 px-3 input-field"/>
                    </div>

                    <div className="mt-4">
                        <label className="text-sm text-gray-300">Password</label>

                        <input type="password" placeholder="Enter Password" name="password"
                               className="w-full h-11 mt-2 px-3 input-field"/>
                    </div>

                    <div className="mt-4">
                        <label className="text-sm text-gray-300">Confirm Password</label>

                        <input type="password" placeholder="Enter Password (again)" name="confirmPassword"
                               className="w-full h-11 mt-2 px-3 input-field"/>
                    </div>

                    <button type="submit"
                            className="w-full h-11 button-color-1 rounded-lg text-white font-semibold shadow-md transition-colors duration-300 mt-4 cursor-pointer">
                        Register
                    </button>
                </form>

                {registerState && registerState.message && registerState.message.length > 0 && (
                    <p className="text-center mt-1 text-red-500">{registerState.message}</p>
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

    console.log(location.hash);

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
            <div className="w-dvw h-dvh grid grid-cols-1 px-4 md:px-0 md:grid-cols-4 lg:grid-cols-3">
                <div className="col-start-1 col-span-1 md:col-start-2 md:col-span-2 lg:col-start-2 lg:col-span-1">
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