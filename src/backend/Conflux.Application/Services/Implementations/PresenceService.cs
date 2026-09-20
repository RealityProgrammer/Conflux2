using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

internal sealed class PresenceService(
    IUserRepository userRepository,
    IPresenceCacheService cacheService,
    ILogger<PresenceService> logger
) : IPresenceService {
    public async Task<PresenceStatus> UserConnected(Guid userId) {
        logger.LogInformation("UserConnected {userId}", userId);
        
        // should only be called once when user connected (connection count go from 0 to 1)
        await cacheService.SetSessionStatus(userId, null);
        return await GetEffectivePresenceAsync(userId);
    }

    public async Task<PresenceStatus> UserDisconnected(Guid userId) {
        logger.LogInformation("UserDisconnected {userId}", userId);
        
        // should only be called once when user finally disconnected everything (connection count go from N to 0)
        await cacheService.SetSessionStatus(userId, null); 
        return PresenceStatus.Offline;  // always return offline, obviously
    }

    public async Task SetUserManualPresenceStatus(Guid userId, PresenceStatus status) {
        await cacheService.SetManualStatus(userId, status);
        await userRepository.AsQueryable()
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(builder => {
                builder.SetProperty(u => u.ManualPresenceStatus, status);
            });
    }

    private async Task<PresenceStatus> GetEffectivePresenceAsync(Guid userId) {
        bool isConnected = await cacheService.IsUserConnected(userId);
        if (!isConnected) return PresenceStatus.Offline;

        var manualStatus = 
            await cacheService.GetManualStatus(userId) ?? 
            (await userRepository.GetManualPresenceStatus(userId) is { IsSuccess: true } result ? result.Value : null);

        if (manualStatus is null or PresenceStatus.Offline or PresenceStatus.Invisible)
            return PresenceStatus.Offline;

        if (manualStatus == PresenceStatus.DoNotDisturb)
            return PresenceStatus.DoNotDisturb;

        var sessionStatus = await cacheService.GetSessionStatus(userId);
        if (sessionStatus == PresenceStatus.Idle)
            return PresenceStatus.Idle;

        return PresenceStatus.Online;
    }
}