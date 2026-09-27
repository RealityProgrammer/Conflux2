using Conflux.Application.Enums;
using Conflux.Domain;
using Conflux.WebApi.Dto;
using MemoryPack;
using StackExchange.Redis;

namespace Conflux.WebApi.Services.Implementations;

internal sealed class CallingService(
    IConnectionMultiplexer connectionMultiplexer
) : ICallingService {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();
    
    public async Task<Result> TryLockCallerAndCallee(Guid callerId, string callerConnectionId, Guid calleeId) {
        var callerKey = GetStateKey(callerId);
        var calleeKey = GetStateKey(calleeId);
        
        var callTimeout = TimeSpan.FromSeconds(60);

        CallSessionState callerState = new(CallState.Ringing, calleeId, callerConnectionId);
        bool callerLocked = await _database.StringSetAsync(callerKey, MemoryPackSerializer.Serialize(callerState), callTimeout, When.NotExists);
        if (!callerLocked) {
            return Errors.AlreadyInCall();
        }

        CallSessionState calleeState = new(CallState.Ringing, callerId, null);
        bool calleeLocked = await _database.StringSetAsync(calleeKey, MemoryPackSerializer.Serialize(calleeState), callTimeout, When.NotExists);
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

    public async Task<Result> AcceptCall(Guid callerId, Guid calleeId, string calleeConnectionId) {
        var callerKey = GetStateKey(callerId);
        var calleeKey = GetStateKey(calleeId);

        RedisValue[] serializedStates = await _database.StringGetAsync([callerKey, calleeKey]);

        if (serializedStates.Length != 2) {
            return Errors.InvalidCallStates();
        }

        var callerState = MemoryPackSerializer.Deserialize<CallSessionState>(serializedStates[0]);
        if (callerState is not { State: CallState.Ringing }) {
            return Errors.InvalidCallStates();
        }
        
        var calleeState = MemoryPackSerializer.Deserialize<CallSessionState>(serializedStates[1]);
        if (calleeState is not { State: CallState.Ringing }) {
            return Errors.InvalidCallStates();
        }

        callerState = callerState with { State = CallState.Active };
        calleeState = calleeState with { State = CallState.Active, ConnectionId = calleeConnectionId };
        var activeTimeout = TimeSpan.FromHours(12);
        
        await _database.StringSetAsync([
            new(callerKey, MemoryPackSerializer.Serialize(callerState)),
            new(calleeKey, MemoryPackSerializer.Serialize(calleeState)),
        ]);

        return Result.Success();
    }

    public async Task<Domain.Result<Guid>> DropCall(Guid userId, string userConnectionId) {
        var stateKey = GetStateKey(userId);
        RedisValue serializedStates = await _database.StringGetAsync(stateKey);

        if (!serializedStates.HasValue) return Errors.ResourceNotFound();

        var state = MemoryPackSerializer.Deserialize<CallSessionState>(serializedStates);
        if (state == null || state.ConnectionId != userConnectionId) {
            return Errors.ResourceNotFound();   // ???
        }
        
        var peerKey = GetStateKey(state.PeerId);
        await _database.KeyDeleteAsync([stateKey, peerKey]);

        return Domain.Result<Guid>.Success(state.PeerId);
    }

    private static string GetStateKey(Guid userId) {
        return $"call:state:{userId}";
    }
}