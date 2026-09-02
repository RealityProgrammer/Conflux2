using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class CommunityServerRepository(
    ApplicationDbContext dbContext
) : ICommunityServerRepository {
    public void Add(CommunityServer communityServer) {
        dbContext.CommunityServers.Add(communityServer);
    }

    public async Task<bool> UpdateHasAvatar(Guid serverId, bool hasAvatar) {
        int changed = await dbContext.CommunityServers
            .Where(s => s.Id == serverId)
            .ExecuteUpdateAsync(setter => {
                setter.SetProperty(s => s.HasAvatar, hasAvatar);
            });
        
        return changed == 1;
    }
    
    public async Task<Result<CommunityServerProfileDto>> GetProfile(
        Guid serverId,
        CancellationToken cancellationToken = default
    ) {
        CommunityServerProfileDto? result = await dbContext.CommunityServers
            .AsNoTracking()
            .Where(c => c.Id == serverId)
            .Select(c => new CommunityServerProfileDto(c.Id, c.Name, c.Description, c.HasAvatar))
            .FirstOrDefaultAsync(cancellationToken);

        return result != null ? Result<CommunityServerProfileDto>.Success(result) : Errors.ResourceNotFound("Server");
    }

    public async Task<List<ChannelCategoryDetailDto>> GetChannelCategorySummaries(
        Guid serverId, 
        CancellationToken cancellationToken = default
    ) {
        // this query would need to be benchmarked cuz im spewing shits here (compare against GROUP BY).
        var categories = await dbContext.ChannelCategories
            .AsNoTracking()
            .Where(c => c.CommunityServerId == serverId)
            .Select(c => new { c.Id, c.Name })
            .ToListAsync(cancellationToken);

        var channels = await dbContext.Channels
            .AsNoTracking()
            .Where(c => (c.Type == ChannelType.CommunityServerText || c.Type == ChannelType.CommunityServerVoice) && c.CommunityServerId == serverId)
            .Select(c => new { c.Id, c.Name, c.ChannelCategoryId, c.Type })
            .ToListAsync(cancellationToken);

        var channelsByCategoryId = channels.ToLookup(c => c.ChannelCategoryId);
        
        var result = new List<ChannelCategoryDetailDto>();
        
        var uncategorizedChannels = channelsByCategoryId[null]
            .Select(c => new ServerChannelIdentityDto(c.Id, c.Name!, c.Type, c.ChannelCategoryId))
            .ToList();

        if (uncategorizedChannels.Count > 0) {
            result.Add(new(null, null, uncategorizedChannels));
        }

        var mappedCategories = categories
            .Select(c => new ChannelCategoryDetailDto(
                c.Id, 
                c.Name,
                [..channelsByCategoryId[c.Id].Select(ch => new ServerChannelIdentityDto(ch.Id, ch.Name!, ch.Type, ch.ChannelCategoryId))]
            ));
        
        result.AddRange(mappedCategories);

        return result;
    }
    public async Task<bool> IsCategoryExistsInServer(
        Guid serverId, 
        Guid categoryId, 
        CancellationToken cancellationToken = default
    ) {
        return await dbContext.ChannelCategories
            .AnyAsync(c => c.Id == categoryId && c.CommunityServerId == serverId, cancellationToken);
    }
}