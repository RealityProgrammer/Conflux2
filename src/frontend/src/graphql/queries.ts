/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { graphqlFetcher } from '../api/client';
import type * as Types from './types';

import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query';
export type BanServerMemberMutationVariables = Exact<{
  serverId: string;
  memberId: string;
  reason?: string | null | undefined;
  duration?: string | null | undefined;
}>;


export type BanServerMemberMutation = { banCommunityServerMember: { memberId: string } };

export type GetInvitationSummaryQueryVariables = Exact<{
  id: string;
}>;


export type GetInvitationSummaryQuery = { invitation: { status: Types.InvitationStatus, communityServer: { id: string, name: string, hasAvatar: boolean, numMembers: number } | null } | null };

export type GetServerMemberAuthorizeInfoQueryVariables = Exact<{
  serverId: string;
  userId: string;
}>;


export type GetServerMemberAuthorizeInfoQuery = { communityServerMemberByServerAndUserId: { id: string, authorizeInfo: { authorizeLevel: number, isBanned: boolean, permissions: Array<{ permission: Types.ServerPermission, isGranted: boolean }> }, roles: Array<{ id: string }> } | null };

export type GetUserFullProfileQueryVariables = Exact<{
  id: string;
}>;


export type GetUserFullProfileQuery = { user: { id: string, userName: string | null, displayName: string | null, hasAvatar: boolean, biography: string | null, pronouns: string | null, createdAt: string, numMutualFriends: number } | null };

export type GetUserIdentityProfileQueryVariables = Exact<{
  id: string;
}>;


export type GetUserIdentityProfileQuery = { user: { id: string, userName: string | null, displayName: string | null, hasAvatar: boolean } | null };

export type InspectMemberQueryVariables = Exact<{
  id: string;
}>;


export type InspectMemberQuery = { communityServerMemberForAdmin: { id: string, createdAt: string, status: Types.MembershipStatus, banExpireAt: string | null, user: { id: string, userName: string | null, displayName: string | null, hasAvatar: boolean }, roles: Array<{ id: string, name: string, authorizeLevel: number, specialRoleType: Types.SpecialRoleType }>, authorizeInfo: { authorizeLevel: number, isBanned: boolean, permissions: Array<{ permission: Types.ServerPermission, isGranted: boolean }> } } | null };

export type KickServerMemberMutationVariables = Exact<{
  serverId: string;
  memberId: string;
  reason?: string | null | undefined;
}>;


export type KickServerMemberMutation = { kickCommunityServerMember: { memberId: string } };

export type UnbanServerMemberMutationVariables = Exact<{
  serverId: string;
  memberId: string;
}>;


export type UnbanServerMemberMutation = { unbanCommunityServerMember: { memberId: string } };

export type UpdateMemberRolesMutationVariables = Exact<{
  serverId: string;
  memberId: string;
  roleIds: Array<string> | string;
}>;


export type UpdateMemberRolesMutation = { updateCommunityServerMemberRoles: { memberId: string } };


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

export const BanServerMemberDocument = new TypedDocumentString(`
    mutation BanServerMember($serverId: UUID!, $memberId: UUID!, $reason: String, $duration: Duration) {
  banCommunityServerMember(
    input: {serverId: $serverId, memberId: $memberId, reason: $reason, duration: $duration}
  ) {
    memberId
  }
}
    `);

export const useBanServerMemberMutation = <
      TError = unknown,
      TContext = unknown
    >(options?: UseMutationOptions<BanServerMemberMutation, TError, BanServerMemberMutationVariables, TContext>) => {
    
    return useMutation<BanServerMemberMutation, TError, BanServerMemberMutationVariables, TContext>(
      {
    mutationKey: ['BanServerMember'],
    mutationFn: (variables?: BanServerMemberMutationVariables) => graphqlFetcher<BanServerMemberMutation, BanServerMemberMutationVariables>(BanServerMemberDocument, variables)(),
    ...options
  }
    )};


useBanServerMemberMutation.fetcher = (variables: BanServerMemberMutationVariables, options?: RequestInit['headers']) => graphqlFetcher<BanServerMemberMutation, BanServerMemberMutationVariables>(BanServerMemberDocument, variables, options);

export const GetInvitationSummaryDocument = new TypedDocumentString(`
    query GetInvitationSummary($id: String!) {
  invitation(id: $id) {
    communityServer {
      id
      name
      hasAvatar
      numMembers
    }
    status
  }
}
    `);

export const useGetInvitationSummaryQuery = <
      TData = GetInvitationSummaryQuery,
      TError = unknown
    >(
      variables: GetInvitationSummaryQueryVariables,
      options?: Omit<UseQueryOptions<GetInvitationSummaryQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetInvitationSummaryQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetInvitationSummaryQuery, TError, TData>(
      {
    queryKey: ['GetInvitationSummary', variables],
    queryFn: graphqlFetcher<GetInvitationSummaryQuery, GetInvitationSummaryQueryVariables>(GetInvitationSummaryDocument, variables),
    ...options
  }
    )};

useGetInvitationSummaryQuery.getKey = (variables: GetInvitationSummaryQueryVariables) => ['GetInvitationSummary', variables];


useGetInvitationSummaryQuery.fetcher = (variables: GetInvitationSummaryQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetInvitationSummaryQuery, GetInvitationSummaryQueryVariables>(GetInvitationSummaryDocument, variables, options);

export const GetServerMemberAuthorizeInfoDocument = new TypedDocumentString(`
    query GetServerMemberAuthorizeInfo($serverId: UUID!, $userId: UUID!) {
  communityServerMemberByServerAndUserId(serverId: $serverId, userId: $userId) {
    id
    authorizeInfo {
      authorizeLevel
      permissions {
        permission
        isGranted
      }
      isBanned
    }
    roles {
      id
    }
  }
}
    `);

export const useGetServerMemberAuthorizeInfoQuery = <
      TData = GetServerMemberAuthorizeInfoQuery,
      TError = unknown
    >(
      variables: GetServerMemberAuthorizeInfoQueryVariables,
      options?: Omit<UseQueryOptions<GetServerMemberAuthorizeInfoQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetServerMemberAuthorizeInfoQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetServerMemberAuthorizeInfoQuery, TError, TData>(
      {
    queryKey: ['GetServerMemberAuthorizeInfo', variables],
    queryFn: graphqlFetcher<GetServerMemberAuthorizeInfoQuery, GetServerMemberAuthorizeInfoQueryVariables>(GetServerMemberAuthorizeInfoDocument, variables),
    ...options
  }
    )};

useGetServerMemberAuthorizeInfoQuery.getKey = (variables: GetServerMemberAuthorizeInfoQueryVariables) => ['GetServerMemberAuthorizeInfo', variables];


useGetServerMemberAuthorizeInfoQuery.fetcher = (variables: GetServerMemberAuthorizeInfoQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetServerMemberAuthorizeInfoQuery, GetServerMemberAuthorizeInfoQueryVariables>(GetServerMemberAuthorizeInfoDocument, variables, options);

export const GetUserFullProfileDocument = new TypedDocumentString(`
    query GetUserFullProfile($id: UUID!) {
  user(id: $id) {
    id
    userName
    displayName
    hasAvatar
    biography
    pronouns
    createdAt
    numMutualFriends
  }
}
    `);

export const useGetUserFullProfileQuery = <
      TData = GetUserFullProfileQuery,
      TError = unknown
    >(
      variables: GetUserFullProfileQueryVariables,
      options?: Omit<UseQueryOptions<GetUserFullProfileQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetUserFullProfileQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetUserFullProfileQuery, TError, TData>(
      {
    queryKey: ['GetUserFullProfile', variables],
    queryFn: graphqlFetcher<GetUserFullProfileQuery, GetUserFullProfileQueryVariables>(GetUserFullProfileDocument, variables),
    ...options
  }
    )};

useGetUserFullProfileQuery.getKey = (variables: GetUserFullProfileQueryVariables) => ['GetUserFullProfile', variables];


useGetUserFullProfileQuery.fetcher = (variables: GetUserFullProfileQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetUserFullProfileQuery, GetUserFullProfileQueryVariables>(GetUserFullProfileDocument, variables, options);

export const GetUserIdentityProfileDocument = new TypedDocumentString(`
    query GetUserIdentityProfile($id: UUID!) {
  user(id: $id) {
    id
    userName
    displayName
    hasAvatar
  }
}
    `);

export const useGetUserIdentityProfileQuery = <
      TData = GetUserIdentityProfileQuery,
      TError = unknown
    >(
      variables: GetUserIdentityProfileQueryVariables,
      options?: Omit<UseQueryOptions<GetUserIdentityProfileQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<GetUserIdentityProfileQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<GetUserIdentityProfileQuery, TError, TData>(
      {
    queryKey: ['GetUserIdentityProfile', variables],
    queryFn: graphqlFetcher<GetUserIdentityProfileQuery, GetUserIdentityProfileQueryVariables>(GetUserIdentityProfileDocument, variables),
    ...options
  }
    )};

useGetUserIdentityProfileQuery.getKey = (variables: GetUserIdentityProfileQueryVariables) => ['GetUserIdentityProfile', variables];


useGetUserIdentityProfileQuery.fetcher = (variables: GetUserIdentityProfileQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<GetUserIdentityProfileQuery, GetUserIdentityProfileQueryVariables>(GetUserIdentityProfileDocument, variables, options);

export const InspectMemberDocument = new TypedDocumentString(`
    query InspectMember($id: UUID!) {
  communityServerMemberForAdmin(id: $id) {
    id
    createdAt
    user {
      id
      userName
      displayName
      hasAvatar
    }
    roles {
      id
      name
      authorizeLevel
      specialRoleType
    }
    authorizeInfo {
      authorizeLevel
      permissions {
        permission
        isGranted
      }
      isBanned
    }
    status
    banExpireAt
  }
}
    `);

export const useInspectMemberQuery = <
      TData = InspectMemberQuery,
      TError = unknown
    >(
      variables: InspectMemberQueryVariables,
      options?: Omit<UseQueryOptions<InspectMemberQuery, TError, TData>, 'queryKey'> & { queryKey?: UseQueryOptions<InspectMemberQuery, TError, TData>['queryKey'] }
    ) => {
    
    return useQuery<InspectMemberQuery, TError, TData>(
      {
    queryKey: ['InspectMember', variables],
    queryFn: graphqlFetcher<InspectMemberQuery, InspectMemberQueryVariables>(InspectMemberDocument, variables),
    ...options
  }
    )};

useInspectMemberQuery.getKey = (variables: InspectMemberQueryVariables) => ['InspectMember', variables];


useInspectMemberQuery.fetcher = (variables: InspectMemberQueryVariables, options?: RequestInit['headers']) => graphqlFetcher<InspectMemberQuery, InspectMemberQueryVariables>(InspectMemberDocument, variables, options);

export const KickServerMemberDocument = new TypedDocumentString(`
    mutation KickServerMember($serverId: UUID!, $memberId: UUID!, $reason: String) {
  kickCommunityServerMember(
    input: {serverId: $serverId, memberId: $memberId, reason: $reason}
  ) {
    memberId
  }
}
    `);

export const useKickServerMemberMutation = <
      TError = unknown,
      TContext = unknown
    >(options?: UseMutationOptions<KickServerMemberMutation, TError, KickServerMemberMutationVariables, TContext>) => {
    
    return useMutation<KickServerMemberMutation, TError, KickServerMemberMutationVariables, TContext>(
      {
    mutationKey: ['KickServerMember'],
    mutationFn: (variables?: KickServerMemberMutationVariables) => graphqlFetcher<KickServerMemberMutation, KickServerMemberMutationVariables>(KickServerMemberDocument, variables)(),
    ...options
  }
    )};


useKickServerMemberMutation.fetcher = (variables: KickServerMemberMutationVariables, options?: RequestInit['headers']) => graphqlFetcher<KickServerMemberMutation, KickServerMemberMutationVariables>(KickServerMemberDocument, variables, options);

export const UnbanServerMemberDocument = new TypedDocumentString(`
    mutation UnbanServerMember($serverId: UUID!, $memberId: UUID!) {
  unbanCommunityServerMember(input: {serverId: $serverId, memberId: $memberId}) {
    memberId
  }
}
    `);

export const useUnbanServerMemberMutation = <
      TError = unknown,
      TContext = unknown
    >(options?: UseMutationOptions<UnbanServerMemberMutation, TError, UnbanServerMemberMutationVariables, TContext>) => {
    
    return useMutation<UnbanServerMemberMutation, TError, UnbanServerMemberMutationVariables, TContext>(
      {
    mutationKey: ['UnbanServerMember'],
    mutationFn: (variables?: UnbanServerMemberMutationVariables) => graphqlFetcher<UnbanServerMemberMutation, UnbanServerMemberMutationVariables>(UnbanServerMemberDocument, variables)(),
    ...options
  }
    )};


useUnbanServerMemberMutation.fetcher = (variables: UnbanServerMemberMutationVariables, options?: RequestInit['headers']) => graphqlFetcher<UnbanServerMemberMutation, UnbanServerMemberMutationVariables>(UnbanServerMemberDocument, variables, options);

export const UpdateMemberRolesDocument = new TypedDocumentString(`
    mutation UpdateMemberRoles($serverId: UUID!, $memberId: UUID!, $roleIds: [UUID!]!) {
  updateCommunityServerMemberRoles(
    input: {serverId: $serverId, memberId: $memberId, roleIds: $roleIds}
  ) {
    memberId
  }
}
    `);

export const useUpdateMemberRolesMutation = <
      TError = unknown,
      TContext = unknown
    >(options?: UseMutationOptions<UpdateMemberRolesMutation, TError, UpdateMemberRolesMutationVariables, TContext>) => {
    
    return useMutation<UpdateMemberRolesMutation, TError, UpdateMemberRolesMutationVariables, TContext>(
      {
    mutationKey: ['UpdateMemberRoles'],
    mutationFn: (variables?: UpdateMemberRolesMutationVariables) => graphqlFetcher<UpdateMemberRolesMutation, UpdateMemberRolesMutationVariables>(UpdateMemberRolesDocument, variables)(),
    ...options
  }
    )};


useUpdateMemberRolesMutation.fetcher = (variables: UpdateMemberRolesMutationVariables, options?: RequestInit['headers']) => graphqlFetcher<UpdateMemberRolesMutation, UpdateMemberRolesMutationVariables>(UpdateMemberRolesDocument, variables, options);
