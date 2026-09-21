using Conflux.Application.Features.Users;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Services.Implementations;

internal sealed class PresenceService(
    IUserRepository userRepository,
    IPresenceCacheService cacheService,
    IMediator mediator
) : IPresenceService {
    public async Task<PresenceStatus> UserConnected(Guid userId) {
        // should only be called once when user connected (connection count go from 0 to 1)
        var oldStatus = await GetCurrentEffectiveStatusOrDefault(userId);
        
        await cacheService.SetSessionStatus(userId, null);
        var newStatus = await GetEffectivePresenceAsync(userId);
        await cacheService.SetEffectiveStatus(userId, newStatus);
        
        await NotifyIfChanged(userId, oldStatus, newStatus);
        
        return newStatus;
    }

    public async Task<PresenceStatus> UserDisconnected(Guid userId) {
        // should only be called once when user finally disconnected everything (connection count go from N to 0)
        var oldStatus = await GetCurrentEffectiveStatusOrDefault(userId);
        
        await cacheService.SetSessionStatus(userId, null);
        await cacheService.SetEffectiveStatus(userId, PresenceStatus.Offline);  // always return offline, obviously
        
        await NotifyIfChanged(userId, oldStatus, PresenceStatus.Offline);
        
        return PresenceStatus.Offline;
    }

    public async Task SetManualPresenceStatus(Guid userId, PresenceStatus status) {
        var oldStatus = await GetCurrentEffectiveStatusOrDefault(userId);
        
        await cacheService.SetManualStatus(userId, status);
        await userRepository.AsQueryable()
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(builder => {
                builder.SetProperty(u => u.ManualPresenceStatus, status);
            });
        
        var newStatus = await GetEffectivePresenceAsync(userId);
        await cacheService.SetEffectiveStatus(userId, newStatus);
        
        await NotifyIfChanged(userId, oldStatus, newStatus);
    }
    
    private async Task<PresenceStatus> GetCurrentEffectiveStatusOrDefault(Guid userId) {
        var cached = await cacheService.GetEffectiveStatus(userId);
        if (cached != null) return cached.Value;
        
        return await GetEffectivePresenceAsync(userId);
    }

    private async Task NotifyIfChanged(Guid userId, PresenceStatus oldStatus, PresenceStatus newStatus) {
        if (oldStatus != newStatus) {
            await mediator.Publish(new UserPresenceChangedNotification(userId, oldStatus, newStatus));
        }
    }
    
    public async Task<PresenceStatus> GetEffectivePresenceStatus(Guid userId) {
        var cached = await cacheService.GetEffectiveStatus(userId);
        if (cached != null) return cached.Value;

        var computed = await GetEffectivePresenceAsync(userId);
        await cacheService.SetEffectiveStatus(userId, computed);
        return computed;
    }
    
    public async Task<IReadOnlyDictionary<Guid, PresenceStatus>> GetEffectivePresenceStatuses(IReadOnlyList<Guid> userIds) {
        var cached = await cacheService.GetEffectiveStatuses(userIds);
        
        var results = new Dictionary<Guid, PresenceStatus>();
        var missingIds = new List<Guid>();

        // extract cached result first
        foreach (var userId in userIds) {
            if (cached.TryGetValue(userId, out var status) && status != null) {
                results[userId] = status.Value;
            } else {
                missingIds.Add(userId);
            }
        }

        // you know the drill and so do i
        if (missingIds.Count == 0) {
            return results;
        }
        
        var rawData = await cacheService.GetRawPresenceData(userIds);
        
        var computedResults = new Dictionary<Guid, PresenceStatus>();
        var missingManualUserIds = new List<Guid>();

        foreach (var userId in missingIds) {
            if (rawData[userId].IsConnected && rawData[userId].ManualStatus == null) {
                missingManualUserIds.Add(userId);
            }
        }

        // 1 DB Query for all users who missed both caches
        Dictionary<Guid, PresenceStatus> dbStatuses = new();
        if (missingManualUserIds.Count > 0) {
            dbStatuses = await userRepository.AsQueryable()
                .Where(u => missingManualUserIds.Contains(u.Id))
                .Select(u => new { u.Id, u.ManualPresenceStatus })
                .ToDictionaryAsync(u => u.Id, u => u.ManualPresenceStatus);
                
            await cacheService.SetManualStatuses(dbStatuses);   // free shit lmao
        }

        foreach (var userId in missingIds) {
            var data = rawData[userId];
            
            if (!data.IsConnected) {
                computedResults[userId] = PresenceStatus.Offline;
                continue;
            }

            var manual = data.ManualStatus ?? dbStatuses.GetValueOrDefault(userId, PresenceStatus.Offline);

            switch (manual) {
                case PresenceStatus.Offline or PresenceStatus.Invisible:
                    computedResults[userId] = PresenceStatus.Offline;
                    break;

                case PresenceStatus.DoNotDisturb:
                    computedResults[userId] = PresenceStatus.DoNotDisturb;
                    break;

                default: {
                    if (data.SessionStatus == PresenceStatus.Idle) {
                        computedResults[userId] = PresenceStatus.Idle;
                    } else {
                        computedResults[userId] = PresenceStatus.Online;
                    }
                    break;
                }
            }
        }

        await cacheService.SetEffectiveStatuses(computedResults);
        
        // merge results
        foreach ((Guid userId, PresenceStatus status) in computedResults) {
            results[userId] = status;
        }

        return results;
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