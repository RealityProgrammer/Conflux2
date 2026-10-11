using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;

namespace Conflux.Infrastructure.Repositories;

internal sealed class CommunityServerRepository(
    ApplicationDbContext dbContext
) : ICommunityServerRepository {
    public IQueryable<CommunityServer> AsQueryable() {
        return dbContext.CommunityServers;
    }
    
    public void Add(CommunityServer communityServer) {
        dbContext.CommunityServers.Add(communityServer);
    }

    public async Task<List<ChannelCategoryDetailDto>> GetChannelCategoryStructure(
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
            .Where(c => (c.Type == ChannelType.Text || c.Type == ChannelType.Voice) && c.CommunityServerId == serverId)
            .SelectFacet<ServerChannelIdentityDto>()
            .ToListAsync(cancellationToken);

        var channelsByCategoryId = channels.ToLookup(c => c.CategoryId);
        
        var result = new List<ChannelCategoryDetailDto>();
        
        var uncategorizedChannels = channelsByCategoryId[null]
            .ToList();

        if (uncategorizedChannels.Count > 0) {
            result.Add(new() {
                Id = null,
                Name = null,
                Channels = uncategorizedChannels,
            });
        }

        var mappedCategories = categories
            .Select(c => new ChannelCategoryDetailDto {
                Id = c.Id, 
                Name = c.Name,
                Channels = [..channelsByCategoryId[c.Id]]
            });
        
        result.AddRange(mappedCategories);

        return result;
    }
}