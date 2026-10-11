using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Facet.Extensions;

namespace Conflux.Infrastructure.Repositories;

internal sealed class ChannelRepository(
    ApplicationDbContext dbContext
) : IChannelRepository {
    public IQueryable<Channel> AsQueryable() {
        return dbContext.Channels;
    }

    public void Add(Channel channel) {
        dbContext.Channels.Add(channel);
    }

    public async Task<Result<ChannelMetadataDto>> GetChannelMetadataFromChannelId(
        Guid channelId,
        CancellationToken cancellationToken = default
    ) {
        ChannelMetadataDto? context = await dbContext.Channels
            .Where(c => c.Id == channelId)
            .SelectFacet<ChannelMetadataDto>()
            .FirstOrDefaultAsync(cancellationToken);

        if (context == null) {
            return Errors.ResourceNotFound("Channel");
        }

        return Result<ChannelMetadataDto>.Success(context);
    }

    public async Task<bool> Delete(Guid serverId, Guid channelId, CancellationToken cancellationToken = default) {
        // TODO: Soft-deletion
        return await dbContext.Channels
            .Where(c => c.CommunityServerId == serverId && c.Id == channelId)
            .ExecuteDeleteAsync(cancellationToken) > 0;
    }
}