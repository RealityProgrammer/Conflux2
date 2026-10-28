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
    IServerEmojiCacheProvider serverEmojiCacheProvider,
    IEmojiReadRepository emojiReadRepository
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

        // get all cache hits
        List<ServerEmojiGroupDto> resultGroups = [];
        List<ServerEmojiGroupInfoDto> cacheMissServers = [];
        
        foreach (var server in joinedServers) {
            if (await serverEmojiCacheProvider.Get(server.ServerId) is { } cached) {
                if (cached.Count > 0) { // ignore server with 0 emoji
                    resultGroups.Add(new(server, cached));
                }
            } else {
                cacheMissServers.Add(server);
            }
        }

        // early return if all servers had cached their emoji entries already
        if (cacheMissServers.Count == 0) {
            return Result<IReadOnlyList<ServerEmojiGroupDto>>.Success(resultGroups);
        }

        List<Guid> cacheMissServerIds = cacheMissServers.Select(s => s.ServerId).ToList();
        
        // query and backfill missing.
        var rawEntries = await emojiReadRepository
            .AsQueryable()
            .Where(e => cacheMissServerIds.Contains(e.ServerId))
            .OrderBy(e => e.ServerId)
            .ThenBy(e => e.ShortCode)
            .Select(e => new {
                e.ServerId,
                EmojiDto = new EmojiEntryDto(e.Id, e.ShortCode)
            })
            .ToListAsync(cancellationToken);
        
        Dictionary<Guid, List<EmojiEntryDto>> queriedGrouped = rawEntries
            .GroupBy(x => x.ServerId)
            .ToDictionary(
                g => g.Key, 
                g => g.Select(x => x.EmojiDto).ToList()
            )
            .ToDictionary();
        
        foreach (var server in cacheMissServers) {
            // Ensure even servers with 0 emojis get an empty list initialized
            var entries = queriedGrouped.TryGetValue(server.ServerId, out var list) ? list : [];
            
            await serverEmojiCacheProvider.Set(server.ServerId, entries);

            if (entries.Count > 0) {    // ignore server with 0 emoji
                resultGroups.Add(new(server, entries));
            }
        }
        
        return Result<IReadOnlyList<ServerEmojiGroupDto>>.Success(resultGroups);
    }
}