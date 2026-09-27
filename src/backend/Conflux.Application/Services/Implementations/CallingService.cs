using Conflux.Application.Enums;
using Conflux.Domain;
using StackExchange.Redis;

namespace Conflux.Application.Services.Implementations;

internal sealed class CallingService(
    IConnectionMultiplexer connectionMultiplexer
) : ICallingService {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<Result> TryLockCallerAndCallee(Guid callerId, Guid calleeId) {
        var callerKey = GetStateKey(callerId);
        var calleeKey = GetStateKey(calleeId);
        
        var callTimeout = TimeSpan.FromSeconds(60);

        RedisValue ringingState = (int)CallState.Ringing;

        bool callerLocked = await _database.StringSetAsync(callerKey, ringingState, callTimeout, When.NotExists);
        if (!callerLocked) {
            return Errors.AlreadyInCall();
        }

        bool calleeLocked = await _database.StringSetAsync(calleeKey, ringingState, callTimeout, When.NotExists);
        if (!calleeLocked) {
            await _database.KeyDeleteAsync(callerKey);
            return Errors.CalleeBusy();
        }

        return Result.Success();
    }

    public async Task<bool> CancelActiveCall(Guid callUser1, Guid callUser2) {
        long deletedCount = await _database.KeyDeleteAsync([
            GetStateKey(callUser1),
            GetStateKey(callUser2),
        ]);
        
        return deletedCount > 0;
    }

    private static string GetStateKey(Guid userId) {
        return $"call:state:{userId}";
    }
}