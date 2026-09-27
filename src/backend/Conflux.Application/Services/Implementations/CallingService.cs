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

    public async Task<Result> CancelCall(Guid callUser1, Guid callUser2) {
        long deletedCount = await _database.KeyDeleteAsync([
            GetStateKey(callUser1),
            GetStateKey(callUser2),
        ]);
        
        return deletedCount == 2 ? Result.Success() : Errors.InvalidCallStates();
    }

    public async Task<Result> AcceptCall(Guid callerId, Guid calleeId) {
        var callerKey = GetStateKey(callerId);
        var calleeKey = GetStateKey(calleeId);

        RedisValue[] states = await _database.StringGetAsync([callerKey, calleeKey]);

        if (states.Length != 2 || states[0] != (int)CallState.Ringing || states[1] != (int)CallState.Ringing) {
            return Errors.InvalidCallStates();
        }

        RedisValue newState = (int)CallState.Active;
        var activeTimeout = TimeSpan.FromHours(12);

        await _database.StringSetAsync([
            new(callerKey, newState),
            new(calleeKey, newState),
        ]);

        return Result.Success();
    }

    private static string GetStateKey(Guid userId) {
        return $"call:state:{userId}";
    }
}