using Conflux.Application.Dto;
using Conflux.Domain.Dto;

namespace Conflux.Application.Services;

public interface IServerEmojiCacheProvider {
    Task<List<EmojiEntryDto>?> Get(Guid serverId);
    Task Set(Guid serverId, List<EmojiEntryDto> emojis);
    Task Remove(Guid serverId);
}