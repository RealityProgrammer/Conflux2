using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Features.Servers;

public sealed record GetMembersServerAuthorizationInfoQuery(
    IReadOnlyCollection<MemberAuthorizeKey> Keys
) : IQuery<Dictionary<Guid, Result<ServerMemberAuthorizationInfoDto>>>;

public sealed class GetMembersServerAuthorizationInfoHandler(
    IServerPermissionsProvider permissionsProvider,
    IServerPermissionsCacheService cacheService
) : IQueryHandler<GetMembersServerAuthorizationInfoQuery, Dictionary<Guid, Result<ServerMemberAuthorizationInfoDto>>> {
    public async ValueTask<Dictionary<Guid, Result<ServerMemberAuthorizationInfoDto>>> Handle(
        GetMembersServerAuthorizationInfoQuery query, 
        CancellationToken cancellationToken
    ) {
        // keyed by member id
        Dictionary<Guid, Result<ServerMemberAuthorizationInfoDto>> finalResults = new(query.Keys.Count);
        
        // handle the worst case that the composite keys has multiple server ids.
        var groupedRequests = query.Keys.GroupBy(k => k.ServerId);

        // reusable collection between each server group
        List<Guid> missingUserIds = [];
        
        foreach (var serverGroup in groupedRequests) {
            Guid serverId = serverGroup.Key;
            List<Guid> userIds = [..serverGroup.Select(k => k.UserId)];
            
            Dictionary<Guid, Guid> userIdToMemberId = serverGroup.ToDictionary(k => k.UserId, k => k.MemberId);
            
            // process cache hits
            var cacheHits = 
                await cacheService.GetUsersAuthorizeInfo(serverId, userIds, cancellationToken);

            foreach ((_, ServerMemberAuthorizationInfoDto authInfo) in cacheHits) {
                finalResults.Add(authInfo.MemberId, Result<ServerMemberAuthorizationInfoDto>.Success(authInfo));
            }
            
            if (cacheHits.Count == userIds.Count) {
                continue;
            }
            
            missingUserIds.Clear();
            missingUserIds.EnsureCapacity(userIds.Count - cacheHits.Count);
            
            foreach (var userId in userIds) {
                if (!cacheHits.ContainsKey(userId)) {
                    missingUserIds.Add(userId);
                }
            }

            Dictionary<Guid, Result<ServerMemberAuthorizationInfoDto>> missRead = 
                await permissionsProvider.GetUsersPermissions(serverId, missingUserIds, cancellationToken);
            
            foreach ((Guid userId, Result<ServerMemberAuthorizationInfoDto> authInfo) in missRead) {
                var memberId = userIdToMemberId[userId];
                finalResults.Add(memberId, authInfo);
            }
        }
        
        return finalResults;
    }
}