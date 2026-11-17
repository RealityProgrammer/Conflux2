using Conflux.Domain.Dto;

namespace Conflux.Application.Services;

public interface IServerEmojiCacheService {
    Task<List<EmojiEntryDto>?> Get(Guid serverId);
    Task Set(Guid serverId, IReadOnlyList<EmojiEntryDto> emojis);
    Task Remove(Guid serverId);
}