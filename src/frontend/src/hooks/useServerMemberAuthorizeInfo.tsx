import type {ServerPermission} from "../graphql/types.ts";
import {useQueryClient} from "@tanstack/react-query";
import {useGetServerMemberAuthorizeInfoQuery} from "../graphql/queries.ts";

export interface UseServerMemberAuthorizeInfoProps {
  serverId: string;
  userId: string;
  enabled?: boolean;
}

export type ServerMemberAuthorizeInfo = {
  id: string;
  authorizeLevel: number;
  effectivePermissions: Record<ServerPermission, boolean>;
  isBanned: boolean;
  roleIds: string[];
  refreshPermissions: () => Promise<void>;
}

export type ServerMemberAuthorizeInfoResult = {
  isLoading: boolean;
  isError: boolean;
  authorizeInfo?: ServerMemberAuthorizeInfo;
}

export default function useServerMemberAuthorizeInfo({
  serverId,
  userId,
  enabled = true,
}: UseServerMemberAuthorizeInfoProps): ServerMemberAuthorizeInfoResult {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useGetServerMemberAuthorizeInfoQuery({
    serverId,
    userId,
  }, {
    enabled,
    staleTime: 30 * 60 * 1000,
  });

  if (isLoading || isError || !data || !data.communityServerMemberByServerAndUserId) {
    return { isLoading, isError };
  }

  const authInfo = data.communityServerMemberByServerAndUserId;

  const effectivePermissions: Record<ServerPermission, boolean> = authInfo.authorizeInfo.permissions.reduce((acc: Record<ServerPermission, boolean>, value) => {
    if (value.isGranted) {
      acc[value.permission] = true;
    }

    return acc;
  }, {} as Record<ServerPermission, boolean>);

  const refreshPermissions = async () => {
    await queryClient.invalidateQueries({
      queryKey: useGetServerMemberAuthorizeInfoQuery.getKey({ serverId, userId }),
    });
  }

  return {
    isLoading: false,
    isError: false,
    authorizeInfo: {
      id: authInfo.id,
      effectivePermissions,
      authorizeLevel: authInfo.authorizeInfo.authorizeLevel,
      isBanned: authInfo.authorizeInfo.isBanned,
      roleIds: authInfo.roles.map(r => r.id),
      refreshPermissions,
    }
  }
}