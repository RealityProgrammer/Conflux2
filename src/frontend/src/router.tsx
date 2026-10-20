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
import CallOverlay from "./components/call/CallOverlay.tsx";
import ExternalLinkDialog from "./components/ExternalLinkDialog.tsx";
import {directConversationService} from "./api/directConversationService.ts";
import MediaPreviewGallery from "./components/MediaPreviewGallery.tsx";
import {Tooltip} from "radix-ui";
import {Slide, ToastContainer} from "react-toastify";
import SuspenseFallback from "./pages/SuspenseFallback.tsx";

import HomePage from "./pages/HomePage"
const AuthenticatePage = lazy(() => import("./pages/auth/AuthenticatePage.tsx"));
import AuthProvider from "./contexts/AuthContext.tsx";
const VerifyEmailPage = lazy(() => import("./pages/auth/VerifyEmailPage.tsx"));
const ConfirmEmailPage = lazy(() => import("./pages/auth/ConfirmEmailPage.tsx"));
const ProfileSetupPage = lazy(() => import("./pages/miscs/ProfileSetupPage.tsx"));
const LobbyLayout = lazy(() => import("./pages/lobby/LobbyLayout.tsx"));
const LobbyPage = lazy(() => import("./pages/lobby/LobbyPage.tsx"));
const DirectMessagePage = lazy(() => import("./pages/lobby/DirectMessagePage.tsx"));
const SystemAnnouncementPage = lazy(() => import("./pages/lobby/SystemAnnouncementPage.tsx"));
const FriendsPage = lazy(() => import("./pages/lobby/FriendsPage.tsx"));
const SignalRProvider = lazy(() => import("./contexts/SignalRContext.tsx"));
const UserLobbyLayout = lazy(() => import("./pages/lobby/UserLobbyLayout.tsx"));
const ServerLayout = lazy(() => import("./pages/server/ServerLayout.tsx"));
const ChannelPage = lazy(() => import("./pages/server/ChannelPage.tsx"));
const PresenceProvider = lazy(() => import("./contexts/PresenceContext.tsx"));
const SettingsLayout = lazy(() => import("./pages/settings/SettingsLayout.tsx"));
const ProfilePage = lazy(() => import("./pages/settings/ProfilePage.tsx"));
const DeleteAccountPage = lazy(() => import("./pages/settings/DeleteAccountPage.tsx"));
const ImpendingDoomPage = lazy(() => import("./pages/ImpendingDoomPage.tsx"));
const InvitePage = lazy(() => import("./pages/invite/InvitePage.tsx"));

export type RootLoaderProps = {
  authorizationInfo: UserAuthorizationInfo;
  userProfile: UserIdentityProfileDto;
}

export type DirectMessagePageLoaderProps = {
  conversationId: string;
  peerProfile: UserIdentityProfileDto;
};

export const router = createBrowserRouter([
  {
    id: "root",
    path: "/",
    loader: async (): Promise<RootLoaderProps | null> => {
      const authResponse: ServiceResponse<UserAuthorizationInfo> = await authService.getAuthorizationInfo();
      if (!authResponse.success || !authResponse.data) return null;
      
      const authInfo: UserAuthorizationInfo = authResponse.data;
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

      return { authorizationInfo: authInfo,  userProfile: profileInfo! };
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
        
        <Tooltip.Provider delayDuration={500}>
          <AuthProvider>
            <Outlet/>
          </AuthProvider>
        </Tooltip.Provider>
      </>
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
            loader: requireGuest,
          },
          {
            path: "verify-email",
            loader: requireUnverified,
            element:
              <Suspense fallback={<SuspenseFallback/>}>
                <VerifyEmailPage/>
              </Suspense>
          },
          {
            path: "confirm-email",
            loader: requireUnverified,
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
          const auth = await requireAuth();
          return auth.isProfileSetup ? redirect('/') : null;
        },
        element:
          <Suspense fallback={<SuspenseFallback/>}>
            <ProfileSetupPage/>
          </Suspense>
      },
      {
        path: "impending-doom",
        loader: async () => {
          const auth = await requireAuth();
          return auth.isPendingDelete ? null : redirect("/lobby");
        },
        element: <ImpendingDoomPage/>
      },
      {
        loader: appGuard,
        // only rerun the loader if the path has truly changed
        shouldRevalidate: ({currentUrl, nextUrl}) => {
          return currentUrl.pathname !== nextUrl.pathname;
        },
        element: (
          <>
            <SignalRProvider>
              <PresenceProvider>
                <Outlet/>
                <CallOverlay/>
              </PresenceProvider>
            </SignalRProvider>

            <MediaPreviewGallery/>

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
                    id: "dm",
                    path: "dm/:userId?",
                    element: <DirectMessagePage/>,
                    loader: async ({params}: LoaderFunctionArgs): Promise<DirectMessagePageLoaderProps | undefined> => {
                      const userId: string | undefined = params.userId;

                      if (!userId) {
                        return undefined;
                      }

                      const summary: ServiceResponse<DirectConversationSummary> =
                        await directConversationService.getDirectConversationSummary(userId);

                      if (!summary.success || !summary.data || !summary.data.conversationId || !summary.data.peerProfile) {
                        return undefined;
                      }

                      return {
                        conversationId: summary.data.conversationId,
                        peerProfile: {
                          ...summary.data.peerProfile,
                          avatar: summary.data.peerProfile.avatarVersion ? {
                            version: summary.data.peerProfile.avatarVersion
                          } : null,
                        },
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
                    element: <ChannelPage/>
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
                path: "delete-account",
                element: <DeleteAccountPage/>
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

// require user to be login, else send to login page
async function requireAuth(): Promise<UserAuthorizationInfo> {
  const response = await authService.getAuthorizationInfo();

  if (response.statusCode !== HttpStatusCode.Ok || !response.data) {
    throw redirect('/auth#login');
  }

  return response.data;
}

// require user to be logged in, else, sends to lobby.
async function requireGuest(): Promise<null> {
  const response = await authService.getAuthorizationInfo();

  if (response.statusCode === HttpStatusCode.Ok && response.data) {
    throw redirect('/lobby/me');
  }

  return null;
}

async function appGuard(): Promise<UserAuthorizationInfo> {
  const authInfo = await requireAuth();

  if (!authInfo.isVerified) {
    throw redirect('/auth/verify-email');
  }

  if (!authInfo.isProfileSetup) {
    throw redirect('/setup-profile');
  }
  
  if (authInfo.isPendingDelete) {
    throw redirect("/impending-doom");
  }

  return authInfo;
}

async function requireUnverified() {
  const response = await requireAuth();

  if (response.isVerified) {
    return redirect('/');
  }

  return null;
}