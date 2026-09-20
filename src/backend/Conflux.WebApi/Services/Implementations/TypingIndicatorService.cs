using Conflux.Domain.Repositories;
using Conflux.WebApi.Dto;
using MemoryPack;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;

namespace Conflux.WebApi.Services.Implementations;

internal sealed partial class TypingIndicatorService(
    IConnectionMultiplexer connectionMultiplexer,
    IUserRepository userRepository
) : ITypingIndicatorService {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<TypingUserDto?> GetTypingUserAsync(string userId, CancellationToken cancellationToken = default) {
        string cacheKey = $"typing_indicator:{userId}";
        byte[]? cached = (byte[]?)await _database.StringGetAsync(cacheKey);

        if (cached != null && MemoryPackSerializer.Deserialize<TypingUserCacheDto>(cached) is { } deserializedCache) {
            return new(deserializedCache.UserId, deserializedCache.DisplayName, deserializedCache.HasAvatar);
        }
        
        if (!Guid.TryParse(userId, out Guid parsedUserId)) {
            return null;
        }
        
        var dto = await userRepository.AsQueryable()
            .AsNoTracking()
            .Where(u => u.Id == parsedUserId)
            .Select(u => new TypingUserDto(
                u.Id,
                u.DisplayName ?? "Someone", 
                u.HasAvatar
            ))
            .FirstOrDefaultAsync(cancellationToken);

        if (dto == null) {
            return null;
        }
        
        await _database.StringSetAsync(
            cacheKey, 
            MemoryPackSerializer.Serialize(new TypingUserCacheDto(dto.UserId, dto.DisplayName, dto.HasAvatar)),
            TimeSpan.FromSeconds(30),
            ValueCondition.Always
        );
        
        return dto;
    }
    
    [MemoryPackable]
    internal sealed partial record TypingUserCacheDto(Guid UserId, string DisplayName, bool HasAvatar);
}