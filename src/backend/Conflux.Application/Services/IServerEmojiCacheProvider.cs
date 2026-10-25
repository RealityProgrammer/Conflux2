using Conflux.Application.Dto;

namespace Conflux.Application.Services;

public interface IServerEmojiCacheProvider {
    Task<List<EmojiListItemDto>?> Get(Guid serverId);
    Task Set(Guid serverId, List<EmojiListItemDto> emojis);
    Task Remove(Guid serverId);
}