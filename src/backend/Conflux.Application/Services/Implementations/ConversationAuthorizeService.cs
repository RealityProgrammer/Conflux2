using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

internal sealed class ConversationAuthorizeService(
    IEnumerable<IChannelAuthorizationStrategy> strategies,
    IChannelRepository channelRepository
) : IConversationAuthorizeService {
    private readonly Dictionary<ChannelType, IChannelAuthorizationStrategy> _strategies = 
        strategies.ToDictionary(x => x.ChannelType);
    
    public async Task<bool> CanSendMessage(Guid userId, Guid channelId, CancellationToken cancellationToken = default) {
        ChannelType? channelType = await channelRepository.AsQueryable()
            .Where(c => c.Id == channelId)
            .Select(c => c.Type)
            .Cast<ChannelType?>()
            .FirstOrDefaultAsync(cancellationToken);
        
        if (channelType == null) return false;

        return await _strategies[channelType.Value].CanSendMessage(userId, channelId);
    }
}