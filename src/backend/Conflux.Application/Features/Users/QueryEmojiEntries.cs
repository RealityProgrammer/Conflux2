using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Users;

public sealed record QueryEmojiEntries : ICommand<Result<IReadOnlyList<ServerEmojiGroupDto>>>;

public sealed class QueryEmojiEntriesHandler(
    ICurrentUserService currentUserService,
    IServerMemberReadRepository serverMemberReadRepository,
    IServerEmojiProvider serverEmojiProvider
) : ICommandHandler<QueryEmojiEntries, Result<IReadOnlyList<ServerEmojiGroupDto>>> {
    public async ValueTask<Result<IReadOnlyList<ServerEmojiGroupDto>>> Handle(
        QueryEmojiEntries command, 
        CancellationToken cancellationToken
    ) {
        if (currentUserService.UserId is not { } userId) {
            return Errors.InvalidIdentifier();
        }

        // get joined server ids
        List<ServerEmojiGroupInfoDto> joinedServers = await serverMemberReadRepository
            .AsQueryable()
            .Where(m => m.UserId == userId && m.Status == MembershipStatus.Active)
            .Include(m => m.CommunityServer)
            .Select(m => new ServerEmojiGroupInfoDto(m.CommunityServerId, m.CommunityServer.Name))
            .ToListAsync(cancellationToken);
        
        if (joinedServers.Count == 0) {
            return Result<IReadOnlyList<ServerEmojiGroupDto>>.Success([]);
        }

        var entries = await serverEmojiProvider.GetEntries(
            [..joinedServers.Select(m => m.ServerId)],
            cancellationToken
        );

        List<ServerEmojiGroupDto> resultGroups = [];

        foreach (var joinedServer in joinedServers) {
            if (!entries.TryGetValue(joinedServer.ServerId, out var entry)) {
                continue;
            }
            
            resultGroups.Add(new(joinedServer, entry));
        }
        
        return Result<IReadOnlyList<ServerEmojiGroupDto>>.Success(resultGroups);
    }
}