import { Suspense, lazy } from 'react';
import {createBrowserRouter, type LoaderFunctionArgs, Outlet, redirect} from "react-router";
import {authService} from "./api/authService.ts";
import {queryClient} from "./main.tsx";
import {useGetUserIdentityProfileQuery} from "./graphql/queries.ts";
import {HttpStatusCode} from "axios";
import type {
  DirectConversationSummary,
  ServiceResponse,
  UserAuthorizationInfo,
  UserIdentityProfileDto,
} from "./api/types.ts";
import HomePage from "./pages/HomePage"
import AuthenticatePage from "./pages/auth/AuthenticatePage.tsx";
import AuthProvider from "./contexts/AuthContext.tsx";
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage.tsx"));
const ConfirmEmailPage = lazy(() => import("./pages/auth/ConfirmEmailPage.tsx"));
const ProfileSetupPage = lazy(() => import("./pages/miscs/ProfileSetupPage.tsx"));
import LobbyLayout from "./pages/lobby/LobbyLayout.tsx";
import {LobbyPage} from "./pages/lobby/LobbyPage.tsx";
import DirectMessagePage from "./pages/lobby/DirectMessagePage.tsx";
import SystemAnnouncementPage from "./pages/lobby/SystemAnnouncementPage.tsx";
import FriendsPage from "./pages/lobby/FriendsPage.tsx";
import SignalRProvider from "./contexts/SignalRContext.tsx";
import UserLobbyLayout from "./pages/lobby/UserLobbyLayout.tsx";
import ServerLayout from "./pages/server/ServerLayout.tsx";
import ChannelPage from "./pages/server/ChannelPage.tsx";
import ChannelLayout from "./pages/server/ChannelLayout.tsx";
import SuspenseFallback from "./pages/SuspenseFallback.tsx";
import {Slide, ToastContainer} from "react-toastify";
import PresenceProvider from "./contexts/PresenceContext.tsx";
import SettingsLayout from "./pages/settings/SettingsLayout.tsx";
import ProfilePage from "./pages/settings/ProfilePage.tsx";
import CallOverlay from "./components/call/CallOverlay.tsx";
import {directConversationService} from "./api/directConversationService.ts";
import ExternalLinkDialog from "./components/ExternalLinkDialog.tsx";
const InvitePage = lazy(() => import("./pages/invite/InvitePage.tsx"));

export type DirectMessagePageLoaderProps = {
  conversationId: string;
  peerProfile: UserIdentityProfileDto;
};

export const router = createBrowserRouter([
  {
    id: "root",
    path: "/",
    loader: async () => {
      const authResponse = await authService.getAuthorizationInfo();

      const authInfo = authResponse.data;
      let profileInfo: UserIdentityProfileDto | null = null;

      if (authInfo?.id) {
        try {
          profileInfo = (await queryClient.query({
            queryKey: useGetUserIdentityProfileQuery.getKey({ id: authInfo.id }),
            queryFn: useGetUserIdentityProfileQuery.fetcher({ id: authInfo.id }),
            staleTime: "static",
          })).user;
        } catch (error) {
          console.error("failed to load user profile: ", error);
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
            // action: authAction,
            loader: async () => {
              const response = await authService.getAuthorizationInfo();

              if (response.statusCode === HttpStatusCode.Ok && response.data) {
                return redirect('/lobby/me');
              }

              return null;
            },
          },
          {
            path: "verify-email",
            loader: restrictConfirmedUser,
            element:
              <Suspense fallback={<SuspenseFallback/>}>
                <VerifyEmailPage/>
              </Suspense>
          },
          {
            path: "confirm-email",
            loader: restrictConfirmedUser,
            element:
              <Suspense fallback={<SuspenseFallback/>}>
                <ConfirmEmailPage/>
              </Suspense>
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
        element:
          <Suspense fallback={<SuspenseFallback/>}>
            <ProfileSetupPage/>
          </Suspense>
      },
      {
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
        shouldRevalidate: ({currentUrl, nextUrl}) => {
          return currentUrl.pathname !== nextUrl.pathname;
        },
        element: (
          <>
            <ToastContainer
              position="top-right"
              autoClose={5000}
              newestOnTop
              draggable="touch"
              pauseOnHover
              theme="dark"
              transition={Slide}
            />

            <SignalRProvider>
              <PresenceProvider>
                <Outlet/>
                <CallOverlay/>
              </PresenceProvider>
            </SignalRProvider>

            <ExternalLinkDialog/>
          </>
        ),
        children: [
          {
            path: "lobby",
            element: <LobbyLayout/>,
            children: [
              {
                index: true,
                element: <LobbyPage/>,
              },
              {
                path: "me",
                element: <UserLobbyLayout/>,
                children: [
                  {
                    path: "announcements",
                    element:
                      <Suspense fallback={<SuspenseFallback/>}>
                        <SystemAnnouncementPage/>
                      </Suspense>
                  },
                  {
                    path: "friends",
                    element: <FriendsPage/>
                  },
                  {
                    path: "dm/:userId?",
                    element: <DirectMessagePage/>,
                    loader: async ({params}: LoaderFunctionArgs): Promise<DirectMessagePageLoaderProps | undefined> => {
                      const userId: string | undefined = params.userId;

                      if (!userId) {
                        return undefined;
                      }

                      const summary: ServiceResponse<DirectConversationSummary> =
                        await directConversationService.getSummary(userId);

                      if (!summary.success || !summary.data || !summary.data.conversationId || !summary.data.peerProfile) {
                        return undefined;
                      }

                      return {
                        conversationId: summary.data.conversationId,
                        peerProfile: summary.data.peerProfile,
                      };
                    }
                  },
                ]
              },
              {
                id: "server",
                path: "servers/:serverId?",
                element: <ServerLayout/>,
                children: [
                  {
                    id: "channel",
                    path: "channels/:channelId?",
                    element: <ChannelLayout/>,
                    children: [
                      {
                        index: true,
                        element: <ChannelPage/>
                      }
                    ]
                  }
                ]
              }
            ]
          },
          {
            path: "invite/:inviteId",
            element:
              <Suspense fallback={<SuspenseFallback/>}>
                <InvitePage/>
              </Suspense>
          },
          {
            path: "settings",
            element: <SettingsLayout/>,
            children: [
              {
                index: true,
                element: (
                  <div className="flex flex-row justify-center items-center size-full">
                    <span className="select-none text-gray-400">Pick what you want to configure on the left sidebar</span>
                  </div>
                ),
              },
              {
                path: "profile",
                element: <ProfilePage/>
              },
              {
                path: "*",
                element: (
                  <div className="flex flex-row justify-center items-center size-full">
                    <span className="select-none text-gray-400">You are not supposed to be here...</span>
                  </div>
                ),
              }
            ],
          }
        ]
      },
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