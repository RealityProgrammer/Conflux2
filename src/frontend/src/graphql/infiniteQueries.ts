/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { graphqlFetcher } from '../api/client';
import type * as Types from './types';

import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
import { useQuery, useInfiniteQuery, type UseQueryOptions, type UseInfiniteQueryOptions, type InfiniteData } from '@tanstack/react-query';
export type GetAssignableServerRolesQueryVariables = Exact<{
  serverId: string;
  nameFilter?: string | null | undefined;
  after?: string | null | undefined;
  authorizeLevel?: number | null | undefined;
}>;


export type GetAssignableServerRolesQuery = { communityServerRoles: { pageInfo: { endCursor: string | null, hasNextPage: boolean }, nodes: Array<{ id: string, name: string }> | null } };

export type GetDirectMessageChannelsQueryVariables = Exact<{
  after?: string | null | undefined;
}>;


export type GetDirectMessageChannelsQuery = { directMessageChannels: { pageInfo: { hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null }, nodes: Array<{ id: string, friendRequest: { otherUser: { id: string, displayName: string | null, avatarRevision: number | null, effectivePresenceStatus: Types.PresenceStatus } | null } | null }> | null } };

export type GetJoinedCommunityServerQueryVariables = Exact<{
  after?: string | null | undefined;
}>;


export type GetJoinedCommunityServerQuery = { joinedServers: { totalCount: number, pageInfo: { hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null }, nodes: Array<{ id: string, name: string, hasAvatar: boolean }> | null } };

export type GetServerModerationLogsQueryVariables = Exact<{
  serverId: string;
  after?: string | null | undefined;
}>;


export type GetServerModerationLogsQuery = { serverModerationLogs: { pageInfo: { endCursor: string | null, hasNextPage: boolean }, nodes: Array<{ id: string, action: Types.ServerModerationAction, createdAt: string, banDuration: string | null, reason: string | null, executorMember: { user: { id: string, displayName: string | null, avatarRevision: number | null } } | null, affectedMember: { user: { id: string, displayName: string | null, avatarRevision: number | null } } | null }> | null } };

export type GetServerRolesByServerIdQueryVariables = Exact<{
  serverId: string;
  nameFilter?: string | null | undefined;
  after?: string | null | undefined;
}>;


export type GetServerRolesByServerIdQuery = { communityServerRoles: { pageInfo: { endCursor: string | null, hasNextPage: boolean }, nodes: Array<{ id: string, name: string, specialRoleType: Types.SpecialRoleType, authorizeLevel: number, createdAt: string, numMembers: number, creatorUser: { id: string, displayName: string | null, avatarRevision: number | null } | null, permissions: Array<{ permission: Types.ServerPermission, state: Types.PermissionState }> }> | null } };

export type SearchServerMemberForAdminQueryVariables = Exact<{
  serverId: string;
  after?: string | null | undefined;
  search?: string | null | undefined;
}>;


export type SearchServerMemberForAdminQuery = { serverMemberSearchForAdmin: { pageInfo: { hasNextPage: boolean, endCursor: string | null }, nodes: Array<{ id: string, user: { id: string, userName: string | null, displayName: string | null, avatarRevision: number | null } }> | null } };


export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const GetAssignableServerRolesDocument = new TypedDocumentString(`
    query GetAssignableServerRoles($serverId: UUID!, $nameFilter: String, $after: String, $authorizeLevel: Int) {
  communityServerRoles(
    serverId: $serverId
    after: $after
    where: {name: {ilike: $nameFilter}, specialRoleType: {eq: None}, authorizeLevel: {lte: $authorizeLevel}}
  ) {
    pageInfo {
      endCursor
      hasNextPage
    }
    nodes {
      id
      name
    }
  }
}
    `);

export const useGetAssignableServerRolesQuery = <
      TData = GetAssignableServerRolesQuery,
      TError = unknown
    >(
      variables: GetAssignableServerRolesQueryVariables,
      options?: Omit<UseQueryOptions<GetAssignableServerRolesQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetAssignableServerRolesQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetAssignableServerRolesQuery, TError, TData>(
      {
    queryKey: ['GetAssignableServerRoles', variables],
    queryFn: graphqlFetcher<GetAssignableServerRolesQuery, GetAssignableServerRolesQueryVariables>(GetAssignableServerRolesDocument, variables),
    ...options
  }
    )};

useGetAssignableServerRolesQuery.getKey = (variables: GetAssignableServerRolesQueryVariables) => ['GetAssignableServerRoles', variables];

export const useInfiniteGetAssignableServerRolesQuery = <
      TData = InfiniteData<GetAssignableServerRolesQuery>,
      TError = unknown
    >(
      variables: GetAssignableServerRolesQueryVariables,
      options: Omit<UseInfiniteQueryOptions<GetAssignableServerRolesQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<GetAssignableServerRolesQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useInfiniteQuery<GetAssignableServerRolesQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['GetAssignableServerRoles.infinite', variables],
      queryFn: (metaData) => graphqlFetcher<GetAssignableServerRolesQuery, GetAssignableServerRolesQueryVariables>(GetAssignableServerRolesDocument, {...variables, ...(metaData.pageParam ?? {})})(),
      ...restOptions
    }
  })()
    )};

useInfiniteGetAssignableServerRolesQuery.getKey = (variables: GetAssignableServerRolesQueryVariables) => ['GetAssignableServerRoles.infinite', variables];


useGetAssignableServerRolesQuery.fetcher = (variables: GetAssignableServerRolesQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetAssignableServerRolesQuery, GetAssignableServerRolesQueryVariables>(GetAssignableServerRolesDocument, variables, options);

export const GetDirectMessageChannelsDocument = new TypedDocumentString(`
    query GetDirectMessageChannels($after: String) {
  directMessageChannels(
    after: $after
    order: {conversation: {latestMessageAt: DESC}}
  ) {
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
    }
    nodes {
      id
      friendRequest {
        otherUser {
          id
          displayName
          avatarRevision
          effectivePresenceStatus
        }
      }
    }
  }
}
    `);

export const useGetDirectMessageChannelsQuery = <
      TData = GetDirectMessageChannelsQuery,
      TError = unknown
    >(
      variables?: GetDirectMessageChannelsQueryVariables,
      options?: Omit<UseQueryOptions<GetDirectMessageChannelsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetDirectMessageChannelsQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetDirectMessageChannelsQuery, TError, TData>(
      {
    queryKey: variables === undefined ? ['GetDirectMessageChannels'] : ['GetDirectMessageChannels', variables],
    queryFn: graphqlFetcher<GetDirectMessageChannelsQuery, GetDirectMessageChannelsQueryVariables>(GetDirectMessageChannelsDocument, variables),
    ...options
  }
    )};

useGetDirectMessageChannelsQuery.getKey = (variables?: GetDirectMessageChannelsQueryVariables) => variables === undefined ? ['GetDirectMessageChannels'] : ['GetDirectMessageChannels', variables];

export const useInfiniteGetDirectMessageChannelsQuery = <
      TData = InfiniteData<GetDirectMessageChannelsQuery>,
      TError = unknown
    >(
      variables: GetDirectMessageChannelsQueryVariables,
      options: Omit<UseInfiniteQueryOptions<GetDirectMessageChannelsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<GetDirectMessageChannelsQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useInfiniteQuery<GetDirectMessageChannelsQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? variables === undefined ? ['GetDirectMessageChannels.infinite'] : ['GetDirectMessageChannels.infinite', variables],
      queryFn: (metaData) => graphqlFetcher<GetDirectMessageChannelsQuery, GetDirectMessageChannelsQueryVariables>(GetDirectMessageChannelsDocument, {...variables, ...(metaData.pageParam ?? {})})(),
      ...restOptions
    }
  })()
    )};

useInfiniteGetDirectMessageChannelsQuery.getKey = (variables?: GetDirectMessageChannelsQueryVariables) => variables === undefined ? ['GetDirectMessageChannels.infinite'] : ['GetDirectMessageChannels.infinite', variables];


useGetDirectMessageChannelsQuery.fetcher = (variables?: GetDirectMessageChannelsQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetDirectMessageChannelsQuery, GetDirectMessageChannelsQueryVariables>(GetDirectMessageChannelsDocument, variables, options);

export const GetJoinedCommunityServerDocument = new TypedDocumentString(`
    query GetJoinedCommunityServer($after: String) {
  joinedServers(after: $after) {
    totalCount
    pageInfo {
      hasNextPage
      hasPreviousPage
      endCursor
    }
    nodes {
      id
      name
      hasAvatar
    }
  }
}
    `);

export const useGetJoinedCommunityServerQuery = <
      TData = GetJoinedCommunityServerQuery,
      TError = unknown
    >(
      variables?: GetJoinedCommunityServerQueryVariables,
      options?: Omit<UseQueryOptions<GetJoinedCommunityServerQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetJoinedCommunityServerQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetJoinedCommunityServerQuery, TError, TData>(
      {
    queryKey: variables === undefined ? ['GetJoinedCommunityServer'] : ['GetJoinedCommunityServer', variables],
    queryFn: graphqlFetcher<GetJoinedCommunityServerQuery, GetJoinedCommunityServerQueryVariables>(GetJoinedCommunityServerDocument, variables),
    ...options
  }
    )};

useGetJoinedCommunityServerQuery.getKey = (variables?: GetJoinedCommunityServerQueryVariables) => variables === undefined ? ['GetJoinedCommunityServer'] : ['GetJoinedCommunityServer', variables];

export const useInfiniteGetJoinedCommunityServerQuery = <
      TData = InfiniteData<GetJoinedCommunityServerQuery>,
      TError = unknown
    >(
      variables: GetJoinedCommunityServerQueryVariables,
      options: Omit<UseInfiniteQueryOptions<GetJoinedCommunityServerQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<GetJoinedCommunityServerQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useInfiniteQuery<GetJoinedCommunityServerQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? variables === undefined ? ['GetJoinedCommunityServer.infinite'] : ['GetJoinedCommunityServer.infinite', variables],
      queryFn: (metaData) => graphqlFetcher<GetJoinedCommunityServerQuery, GetJoinedCommunityServerQueryVariables>(GetJoinedCommunityServerDocument, {...variables, ...(metaData.pageParam ?? {})})(),
      ...restOptions
    }
  })()
    )};

useInfiniteGetJoinedCommunityServerQuery.getKey = (variables?: GetJoinedCommunityServerQueryVariables) => variables === undefined ? ['GetJoinedCommunityServer.infinite'] : ['GetJoinedCommunityServer.infinite', variables];


useGetJoinedCommunityServerQuery.fetcher = (variables?: GetJoinedCommunityServerQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetJoinedCommunityServerQuery, GetJoinedCommunityServerQueryVariables>(GetJoinedCommunityServerDocument, variables, options);

export const GetServerModerationLogsDocument = new TypedDocumentString(`
    query GetServerModerationLogs($serverId: UUID!, $after: String) {
  serverModerationLogs(
    serverId: $serverId
    after: $after
    order: {createdAt: DESC}
  ) {
    pageInfo {
      endCursor
      hasNextPage
    }
    nodes {
      id
      executorMember {
        user {
          id
          displayName
          avatarRevision
        }
      }
      action
      affectedMember {
        user {
          id
          displayName
          avatarRevision
        }
      }
      createdAt
      banDuration
      reason
    }
  }
}
    `);

export const useGetServerModerationLogsQuery = <
      TData = GetServerModerationLogsQuery,
      TError = unknown
    >(
      variables: GetServerModerationLogsQueryVariables,
      options?: Omit<UseQueryOptions<GetServerModerationLogsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetServerModerationLogsQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetServerModerationLogsQuery, TError, TData>(
      {
    queryKey: ['GetServerModerationLogs', variables],
    queryFn: graphqlFetcher<GetServerModerationLogsQuery, GetServerModerationLogsQueryVariables>(GetServerModerationLogsDocument, variables),
    ...options
  }
    )};

useGetServerModerationLogsQuery.getKey = (variables: GetServerModerationLogsQueryVariables) => ['GetServerModerationLogs', variables];

export const useInfiniteGetServerModerationLogsQuery = <
      TData = InfiniteData<GetServerModerationLogsQuery>,
      TError = unknown
    >(
      variables: GetServerModerationLogsQueryVariables,
      options: Omit<UseInfiniteQueryOptions<GetServerModerationLogsQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<GetServerModerationLogsQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useInfiniteQuery<GetServerModerationLogsQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['GetServerModerationLogs.infinite', variables],
      queryFn: (metaData) => graphqlFetcher<GetServerModerationLogsQuery, GetServerModerationLogsQueryVariables>(GetServerModerationLogsDocument, {...variables, ...(metaData.pageParam ?? {})})(),
      ...restOptions
    }
  })()
    )};

useInfiniteGetServerModerationLogsQuery.getKey = (variables: GetServerModerationLogsQueryVariables) => ['GetServerModerationLogs.infinite', variables];


useGetServerModerationLogsQuery.fetcher = (variables: GetServerModerationLogsQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetServerModerationLogsQuery, GetServerModerationLogsQueryVariables>(GetServerModerationLogsDocument, variables, options);

export const GetServerRolesByServerIdDocument = new TypedDocumentString(`
    query GetServerRolesByServerId($serverId: UUID!, $nameFilter: String, $after: String) {
  communityServerRoles(
    serverId: $serverId
    after: $after
    where: {name: {ilike: $nameFilter}}
  ) {
    pageInfo {
      endCursor
      hasNextPage
    }
    nodes {
      id
      name
      specialRoleType
      authorizeLevel
      createdAt
      numMembers
      creatorUser {
        id
        displayName
        avatarRevision
      }
      permissions {
        permission
        state
      }
    }
  }
}
    `);

export const useGetServerRolesByServerIdQuery = <
      TData = GetServerRolesByServerIdQuery,
      TError = unknown
    >(
      variables: GetServerRolesByServerIdQueryVariables,
      options?: Omit<UseQueryOptions<GetServerRolesByServerIdQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetServerRolesByServerIdQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetServerRolesByServerIdQuery, TError, TData>(
      {
    queryKey: ['GetServerRolesByServerId', variables],
    queryFn: graphqlFetcher<GetServerRolesByServerIdQuery, GetServerRolesByServerIdQueryVariables>(GetServerRolesByServerIdDocument, variables),
    ...options
  }
    )};

useGetServerRolesByServerIdQuery.getKey = (variables: GetServerRolesByServerIdQueryVariables) => ['GetServerRolesByServerId', variables];

export const useInfiniteGetServerRolesByServerIdQuery = <
      TData = InfiniteData<GetServerRolesByServerIdQuery>,
      TError = unknown
    >(
      variables: GetServerRolesByServerIdQueryVariables,
      options: Omit<UseInfiniteQueryOptions<GetServerRolesByServerIdQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<GetServerRolesByServerIdQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useInfiniteQuery<GetServerRolesByServerIdQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['GetServerRolesByServerId.infinite', variables],
      queryFn: (metaData) => graphqlFetcher<GetServerRolesByServerIdQuery, GetServerRolesByServerIdQueryVariables>(GetServerRolesByServerIdDocument, {...variables, ...(metaData.pageParam ?? {})})(),
      ...restOptions
    }
  })()
    )};

useInfiniteGetServerRolesByServerIdQuery.getKey = (variables: GetServerRolesByServerIdQueryVariables) => ['GetServerRolesByServerId.infinite', variables];


useGetServerRolesByServerIdQuery.fetcher = (variables: GetServerRolesByServerIdQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetServerRolesByServerIdQuery, GetServerRolesByServerIdQueryVariables>(GetServerRolesByServerIdDocument, variables, options);

export const SearchServerMemberForAdminDocument = new TypedDocumentString(`
    query SearchServerMemberForAdmin($serverId: UUID!, $after: String, $search: String) {
  serverMemberSearchForAdmin(serverId: $serverId, after: $after, search: $search) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      user {
        id
        userName
        displayName
        avatarRevision
      }
    }
  }
}
    `);

export const useSearchServerMemberForAdminQuery = <
      TData = SearchServerMemberForAdminQuery,
      TError = unknown
    >(
      variables: SearchServerMemberForAdminQueryVariables,
      options?: Omit<UseQueryOptions<SearchServerMemberForAdminQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<SearchServerMemberForAdminQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<SearchServerMemberForAdminQuery, TError, TData>(
      {
    queryKey: ['SearchServerMemberForAdmin', variables],
    queryFn: graphqlFetcher<SearchServerMemberForAdminQuery, SearchServerMemberForAdminQueryVariables>(SearchServerMemberForAdminDocument, variables),
    ...options
  }
    )};

useSearchServerMemberForAdminQuery.getKey = (variables: SearchServerMemberForAdminQueryVariables) => ['SearchServerMemberForAdmin', variables];

export const useInfiniteSearchServerMemberForAdminQuery = <
      TData = InfiniteData<SearchServerMemberForAdminQuery>,
      TError = unknown
    >(
      variables: SearchServerMemberForAdminQueryVariables,
      options: Omit<UseInfiniteQueryOptions<SearchServerMemberForAdminQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<SearchServerMemberForAdminQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useInfiniteQuery<SearchServerMemberForAdminQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['SearchServerMemberForAdmin.infinite', variables],
      queryFn: (metaData) => graphqlFetcher<SearchServerMemberForAdminQuery, SearchServerMemberForAdminQueryVariables>(SearchServerMemberForAdminDocument, {...variables, ...(metaData.pageParam ?? {})})(),
      ...restOptions
    }
  })()
    )};

useInfiniteSearchServerMemberForAdminQuery.getKey = (variables: SearchServerMemberForAdminQueryVariables) => ['SearchServerMemberForAdmin.infinite', variables];


useSearchServerMemberForAdminQuery.fetcher = (variables: SearchServerMemberForAdminQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<SearchServerMemberForAdminQuery, SearchServerMemberForAdminQueryVariables>(SearchServerMemberForAdminDocument, variables, options);
