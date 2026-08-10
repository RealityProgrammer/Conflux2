import {createBrowserRouter, type LoaderFunctionArgs, Outlet, redirect} from "react-router";
import HomePage from "./pages/HomePage"
import AuthenticatePage, { authAction } from "./pages/auth/AuthenticatePage.tsx";
import AuthProvider from "./contexts/AuthContext.tsx";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage.tsx";
import { authService } from "./api/authService.ts";
import { HttpStatusCode } from "axios";
import type {
    DmChannelSummary,
    ServiceResponse,
    UserAuthorizationInfo,
} from "./api/responses.ts";
import ConfirmEmailPage from "./pages/auth/ConfirmEmailPage.tsx";
import ProfileSetupPage from "./pages/miscs/ProfileSetupPage.tsx";
import { userService } from "./api/userService.ts";
import LobbyLayout from "./layouts/LobbyLayout.tsx";
import { LobbyPage } from "./pages/lobby/LobbyPage.tsx";
import DirectMessagePage from "./pages/lobby/DirectMessagePage.tsx";
import SystemAnnouncementPage from "./pages/lobby/SystemAnnouncementPage.tsx";
import FriendsPage from "./pages/lobby/FriendsPage.tsx";
import {channelService} from "./api/channelService.ts";
import SignalRConnectionProvider from "./contexts/SignalRContext.tsx";
import Egg from "./components/Egg.tsx";

export type DirectMessagePageLoaderProps = {
    channelId: string | null;
    channelSummary: DmChannelSummary | null;
};

export const router = createBrowserRouter([
    {
        id: "root",
        path: "/",
        loader: async () => {
            const [authResponse] = await Promise.all([
                authService.getAuthorizationInfo(),
            ]);

            const authInfo = authResponse.data;
            let profileInfo = null;

            if (authInfo?.id) {
                try {
                    const profileResponse = await userService.getSessionUserBasicProfile();
                    profileInfo = profileResponse.data;
                } catch (error) {
                    console.error("Failed to load user profile: ", error);
                }
            }

            return {
                authorizationInfo: authInfo,
                userProfile: profileInfo
            };
        },
        element: (
            <AuthProvider>
                <Outlet/>
            </AuthProvider>
        ),
        children: [
            {
                index: true,
                element: <HomePage/>,
            },
            {
                path: "auth",
                children: [
                    {
                        index: true,
                        element: <AuthenticatePage/>,
                        action: authAction,
                        loader: async () => {
                            const response = await authService.getAuthorizationInfo();

                            if (response.statusCode === HttpStatusCode.Ok && response.data) {
                                return redirect('/lobby');
                            }

                            return null;
                        },
                    },
                    {
                        path: "verify-email",
                        element: <VerifyEmailPage/>,
                        loader: restrictConfirmedUser,
                    },
                    {
                        path: "confirm-email",
                        element: <ConfirmEmailPage/>,
                        loader: restrictConfirmedUser,
                    }
                ]
            },
            {
                path: "setup-profile",
                loader: async () => {
                    const response = await authService.getAuthorizationInfo();

                    if (response.statusCode !== HttpStatusCode.Ok || !response.data) {
                        return redirect('/auth#login');
                    }

                    return response.data.isProfileSetup ? redirect('/') : null;
                },
                element: <ProfileSetupPage/>
            },
            {
                id: "lobby",
                path: "lobby",
                loader: async () => {
                    const response = await authService.getAuthorizationInfo();

                    if (response.statusCode !== HttpStatusCode.Ok || !response.data) {
                        return redirect('/auth#login');
                    }

                    const authorizationInfo: UserAuthorizationInfo = response.data;

                    if (!authorizationInfo.isVerified) {
                        return redirect("/auth/verify-email");
                    }

                    if (!authorizationInfo.isProfileSetup) {
                        return redirect("/setup-profile");
                    }

                    return null;
                },
                // only rerun the loader if the path has truly changed
                shouldRevalidate: ({ currentUrl, nextUrl }) => {
                    return currentUrl.pathname !== nextUrl.pathname;
                },
                element: (
                    <SignalRConnectionProvider>
                        <LobbyLayout/>
                    </SignalRConnectionProvider>
                ),
                children: [
                    {
                        index: true,
                        element: <LobbyPage/>
                    },
                    {
                        path: "announcements",
                        element: <SystemAnnouncementPage/>
                    },
                    {
                        path: "friends",
                        element: <FriendsPage/>
                    },
                    {
                        path: "dm/:userId?",
                        element: <DirectMessagePage/>,
                        loader: async ({ params }: LoaderFunctionArgs): Promise<DirectMessagePageLoaderProps> => {
                            const userId: string | undefined = params.userId;

                            if (!userId) {
                                return { channelId: null, channelSummary: null };
                            }

                            const channelIdResponse: ServiceResponse<string> =
                                await channelService.getDirectMessageChannelId(userId);

                            if (!channelIdResponse.success) {
                                return { channelId: null, channelSummary: null };
                            }

                            const channelId: string = channelIdResponse.data!;

                            const dmChannelSummary: ServiceResponse<DmChannelSummary> =
                                await channelService.getDmChannelSummary(channelId);

                            if (!dmChannelSummary.success) {
                                return { channelId: channelId, channelSummary: null };
                            }

                            return { channelId: channelId, channelSummary: dmChannelSummary.data! };
                        }
                    },
                ]
            }
        ]
    }
]);

async function restrictConfirmedUser() {
    const response = await authService.getAuthorizationInfo();

    if (response.statusCode === HttpStatusCode.Ok && response.data && response.data.isVerified) {
        return redirect('/');
    }

    return null;
}