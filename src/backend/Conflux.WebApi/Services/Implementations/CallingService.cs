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

    public async Task<Result> CancelCall(Guid callerId, Guid calleeId) {
        return await SafeDeleteRingingCall(callerId, calleeId);
    }

    public async Task<Result> DenyCall(Guid callerId, Guid calleeId) {
        return await SafeDeleteRingingCall(callerId, calleeId);
    }

    public async Task<Result> AcceptCall(Guid callerId, Guid calleeId, string calleeConnectionId) {
        var callerKey = GetStateKey(callerId);
        var calleeKey = GetStateKey(calleeId);

        RedisValue[] serializedStates = await _database.StringGetAsync([callerKey, calleeKey]);

        if (!serializedStates[0].HasValue || !serializedStates[1].HasValue) {
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

        if (callerState.PeerId != calleeId || calleeState.PeerId != callerId) {
            return Errors.InvalidCallStates();
        }

        callerState = callerState with { State = CallState.Active };
        calleeState = calleeState with { State = CallState.Active, ConnectionId = calleeConnectionId };
        var activeTimeout = TimeSpan.FromHours(12);
        
        ITransaction transaction = _database.CreateTransaction();

        transaction.AddCondition(Condition.KeyExists(callerKey));
        transaction.AddCondition(Condition.KeyExists(calleeKey));
        
        _ = transaction.StringSetAsync(callerKey, MemoryPackSerializer.Serialize(callerState), activeTimeout);
        _ = transaction.StringSetAsync(calleeKey, MemoryPackSerializer.Serialize(calleeState), activeTimeout);
        
        bool committed = await transaction.ExecuteAsync();
        
        if (!committed) {
            // caller hung up (or timeout occurred) right as the callee clicked accept.
            return Errors.InvalidCallStates(); 
        }

        return Result.Success();
    }

    public async Task<Domain.Result<Guid>> DropCall(Guid userId, string userConnectionId) {
        var stateKey = GetStateKey(userId);
        RedisValue serializedStates = await _database.StringGetAsync(stateKey);

        if (!serializedStates.HasValue) return Errors.ResourceNotFound();

        var state = MemoryPackSerializer.Deserialize<CallSessionState>(serializedStates);
        if (state == null || state.ConnectionId != userConnectionId) return Errors.ResourceNotFound();
        
        var peerKey = GetStateKey(state.PeerId);
        await _database.KeyDeleteAsync([stateKey, peerKey]);

        return Domain.Result<Guid>.Success(state.PeerId);
    }

    public async Task<Domain.Result<Guid>> EndCall(Guid enderId, Guid peerId) {
        var stateKey = GetStateKey(enderId);
        RedisValue serializedStates = await _database.StringGetAsync(stateKey);

        if (!serializedStates.HasValue) return Errors.ResourceNotFound();

        var state = MemoryPackSerializer.Deserialize<CallSessionState>(serializedStates);
        if (state == null) return Errors.ResourceNotFound();
        if (state.State != CallState.Active || state.PeerId != peerId) return Errors.InvalidCallStates();
        
        var peerKey = GetStateKey(state.PeerId);
        await _database.KeyDeleteAsync([stateKey, peerKey]);

        return Domain.Result<Guid>.Success(state.PeerId);
    }

    public async Task<Domain.Result<Guid>> GetCurrentRingingCall(Guid userId) {
        var stateKey = GetStateKey(userId);
        var serializedState = await _database.StringGetAsync(stateKey);

        if (!serializedState.HasValue) return Errors.ResourceNotFound();

        var state = MemoryPackSerializer.Deserialize<CallSessionState>(serializedState);
        if (state is not { State: CallState.Ringing }) return Errors.ResourceNotFound();
        
        return Domain.Result<Guid>.Success(state.PeerId);
    }

    private async Task<Result> SafeDeleteRingingCall(Guid actionUserId, Guid peerId) {
        var stateKey = GetStateKey(actionUserId);
        var serializedState = await _database.StringGetAsync(stateKey);

        // Idempotent: If already deleted (e.g. timeout), consider it a success
        if (!serializedState.HasValue) return Result.Success(); 

        var state = MemoryPackSerializer.Deserialize<CallSessionState>(serializedState);
        
        // Security check: Make sure this user is actually ringing with the specified peer
        if (state == null || state.State != CallState.Ringing || state.PeerId != peerId) {
            return Errors.InvalidCallStates();
        }

        await _database.KeyDeleteAsync([
            GetStateKey(actionUserId),
            GetStateKey(peerId),
        ]);

        return Result.Success();
    }

    private static string GetStateKey(Guid userId) {
        return $"call:state:{userId}";
    }
}