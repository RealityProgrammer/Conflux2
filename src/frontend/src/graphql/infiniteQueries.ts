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


export type GetAssignableServerRolesQuery = { communityServerRoles: { pageInfo: { endCursor: string | null, hasNextPage: boolean }, nodes: Array<{ id: string, name: string }> | null } | null };

export type GetJoinedCommunityServerQueryVariables = Exact<{
  after?: string | null | undefined;
}>;


export type GetJoinedCommunityServerQuery = { joinedServers: { totalCount: number, pageInfo: { hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null }, nodes: Array<{ id: string, name: string, hasAvatar: boolean }> | null } | null };

export type GetServerRolesByServerIdQueryVariables = Exact<{
  serverId: string;
  nameFilter?: string | null | undefined;
  after?: string | null | undefined;
}>;


export type GetServerRolesByServerIdQuery = { communityServerRoles: { pageInfo: { endCursor: string | null, hasNextPage: boolean }, nodes: Array<{ id: string, name: string, specialRoleType: Types.SpecialRoleType, authorizeLevel: number, createdAt: string, numMembers: number, creatorUser: { id: string, displayName: string | null, hasAvatar: boolean } | null, permissions: Array<{ permission: Types.ServerPermission, state: Types.PermissionState }> }> | null } | null };

export type ServerMemberSearchQueryVariables = Exact<{
  serverId: string;
  after?: string | null | undefined;
  search?: string | null | undefined;
  status: Array<Types.MembershipStatus> | Types.MembershipStatus;
}>;


export type ServerMemberSearchQuery = { communityServerMembers: { pageInfo: { hasNextPage: boolean, endCursor: string | null }, nodes: Array<{ id: string, user: { id: string, userName: string | null, displayName: string | null, hasAvatar: boolean } }> | null } | null };


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
    where: {
      name: { ilike: $nameFilter }
      specialRoleType: { eq: None }
      authorizeLevel: { lte: $authorizeLevel }
    }
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

export const GetServerRolesByServerIdDocument = new TypedDocumentString(`
    query GetServerRolesByServerId($serverId: UUID!, $nameFilter: String, $after: String) {
  communityServerRoles(
    serverId: $serverId
    after: $after
    where: { name: { ilike: $nameFilter } }
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
        hasAvatar
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

export const ServerMemberSearchDocument = new TypedDocumentString(`
    query ServerMemberSearch($serverId: UUID!, $after: String, $search: String, $status: [MembershipStatus!]!) {
  communityServerMembers(
    serverId: $serverId
    after: $after
    search: $search
    where: { status: { in: $status } }
  ) {
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
        hasAvatar
      }
    }
  }
}
    `);

export const useServerMemberSearchQuery = <
      TData = ServerMemberSearchQuery,
      TError = unknown
    >(
      variables: ServerMemberSearchQueryVariables,
      options?: Omit<UseQueryOptions<ServerMemberSearchQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<ServerMemberSearchQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<ServerMemberSearchQuery, TError, TData>(
      {
    queryKey: ['ServerMemberSearch', variables],
    queryFn: graphqlFetcher<ServerMemberSearchQuery, ServerMemberSearchQueryVariables>(ServerMemberSearchDocument, variables),
    ...options
  }
    )};

useServerMemberSearchQuery.getKey = (variables: ServerMemberSearchQueryVariables) => ['ServerMemberSearch', variables];

export const useInfiniteServerMemberSearchQuery = <
      TData = InfiniteData<ServerMemberSearchQuery>,
      TError = unknown
    >(
      variables: ServerMemberSearchQueryVariables,
      options: Omit<UseInfiniteQueryOptions<ServerMemberSearchQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<ServerMemberSearchQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useInfiniteQuery<ServerMemberSearchQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['ServerMemberSearch.infinite', variables],
      queryFn: (metaData) => graphqlFetcher<ServerMemberSearchQuery, ServerMemberSearchQueryVariables>(ServerMemberSearchDocument, {...variables, ...(metaData.pageParam ?? {})})(),
      ...restOptions
    }
  })()
    )};

useInfiniteServerMemberSearchQuery.getKey = (variables: ServerMemberSearchQueryVariables) => ['ServerMemberSearch.infinite', variables];


useServerMemberSearchQuery.fetcher = (variables: ServerMemberSearchQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<ServerMemberSearchQuery, ServerMemberSearchQueryVariables>(ServerMemberSearchDocument, variables, options);
