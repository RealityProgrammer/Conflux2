/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { graphqlFetcher } from '../api/client';
import type * as Types from './types';

import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
import { useQuery, useInfiniteQuery, type UseQueryOptions, type UseInfiniteQueryOptions, type InfiniteData } from '@tanstack/react-query';
export type GetAssignableServerRolesByServerIdQueryVariables = Exact<{
  serverId: string;
  nameFilter?: string | null | undefined;
  after?: string | null | undefined;
  authorizeLevel?: number | null | undefined;
}>;


export type GetAssignableServerRolesByServerIdQuery = { communityServerRolesByServerId: { pageInfo: { endCursor: string | null, hasNextPage: boolean }, nodes: Array<{ id: string, name: string }> | null } | null };

export type GetJoinedCommunityServerQueryVariables = Exact<{
  after?: string | null | undefined;
}>;


export type GetJoinedCommunityServerQuery = { joinedServers: { totalCount: number, pageInfo: { hasNextPage: boolean, hasPreviousPage: boolean, endCursor: string | null }, nodes: Array<{ id: string, name: string, hasAvatar: boolean }> | null } | null };

export type GetServerRolesByServerIdQueryVariables = Exact<{
  serverId: string;
  nameFilter?: string | null | undefined;
  after?: string | null | undefined;
}>;


export type GetServerRolesByServerIdQuery = { communityServerRolesByServerId: { pageInfo: { endCursor: string | null, hasNextPage: boolean }, nodes: Array<{ id: string, name: string, specialRoleType: Types.SpecialRoleType, authorizeLevel: number, createdAt: string, numMembers: number, creatorUser: { id: string, displayName: string | null, hasAvatar: boolean } | null, permissions: Array<{ permission: Types.ServerPermission, state: Types.PermissionState }> }> | null } | null };

export type ServerMemberSearchQueryVariables = Exact<{
  serverId: string;
  after?: string | null | undefined;
  search?: string | null | undefined;
}>;


export type ServerMemberSearchQuery = { communityServerMembersFromServerId: { pageInfo: { hasNextPage: boolean, endCursor: string | null }, nodes: Array<{ id: string, user: { id: string, userName: string | null, displayName: string | null, hasAvatar: boolean } }> | null } | null };


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

export const GetAssignableServerRolesByServerIdDocument = new TypedDocumentString(`
    query GetAssignableServerRolesByServerId($serverId: UUID!, $nameFilter: String, $after: String, $authorizeLevel: Int) {
  communityServerRolesByServerId(
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

export const useGetAssignableServerRolesByServerIdQuery = <
      TData = GetAssignableServerRolesByServerIdQuery,
      TError = unknown
    >(
      variables: GetAssignableServerRolesByServerIdQueryVariables,
      options?: Omit<UseQueryOptions<GetAssignableServerRolesByServerIdQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetAssignableServerRolesByServerIdQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetAssignableServerRolesByServerIdQuery, TError, TData>(
      {
    queryKey: ['GetAssignableServerRolesByServerId', variables],
    queryFn: graphqlFetcher<GetAssignableServerRolesByServerIdQuery, GetAssignableServerRolesByServerIdQueryVariables>(GetAssignableServerRolesByServerIdDocument, variables),
    ...options
  }
    )};

useGetAssignableServerRolesByServerIdQuery.getKey = (variables: GetAssignableServerRolesByServerIdQueryVariables) => ['GetAssignableServerRolesByServerId', variables];

export const useInfiniteGetAssignableServerRolesByServerIdQuery = <
      TData = InfiniteData<GetAssignableServerRolesByServerIdQuery>,
      TError = unknown
    >(
      variables: GetAssignableServerRolesByServerIdQueryVariables,
      options: Omit<UseInfiniteQueryOptions<GetAssignableServerRolesByServerIdQuery, TError, TData>, 'queryKey'> & { queryKey?: UseInfiniteQueryOptions<GetAssignableServerRolesByServerIdQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useInfiniteQuery<GetAssignableServerRolesByServerIdQuery, TError, TData>(
      (() => {
    const { queryKey: optionsQueryKey, ...restOptions } = options;
    return {
      queryKey: optionsQueryKey ?? ['GetAssignableServerRolesByServerId.infinite', variables],
      queryFn: (metaData) => graphqlFetcher<GetAssignableServerRolesByServerIdQuery, GetAssignableServerRolesByServerIdQueryVariables>(GetAssignableServerRolesByServerIdDocument, {...variables, ...(metaData.pageParam ?? {})})(),
      ...restOptions
    }
  })()
    )};

useInfiniteGetAssignableServerRolesByServerIdQuery.getKey = (variables: GetAssignableServerRolesByServerIdQueryVariables) => ['GetAssignableServerRolesByServerId.infinite', variables];


useGetAssignableServerRolesByServerIdQuery.fetcher = (variables: GetAssignableServerRolesByServerIdQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetAssignableServerRolesByServerIdQuery, GetAssignableServerRolesByServerIdQueryVariables>(GetAssignableServerRolesByServerIdDocument, variables, options);

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
  communityServerRolesByServerId(
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
    query ServerMemberSearch($serverId: UUID!, $after: String, $search: String) {
  communityServerMembersFromServerId(
    serverId: $serverId
    after: $after
    search: $search
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
