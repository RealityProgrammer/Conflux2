using Conflux.Application.Dto;
using Conflux.Domain;
using StackExchange.Redis;

namespace Conflux.Application.Services.Implementations;

internal sealed partial class CallingService(
    IConnectionMultiplexer connectionMultiplexer,
    TimeProvider timeProvider,
    ILogger<CallingService> logger
) : ICallingService {
    private readonly IDatabase _database = connectionMultiplexer.GetDatabase();

    private const int RingingTimeoutSec = 60;
    private const int ActiveCallTimeoutSec = 43200; // 12 hours
    
    private static readonly LuaScript 
        InitializeDirectCallScript, 
        AcceptDirectCallScript, 
        LeaveOrEndCallScript, 
        DropUserCallScript;

    static CallingService() {
        InitializeDirectCallScript = LuaScript.Prepare(
            """
            if redis.call("EXISTS", @callerCallStateKey) == 1 then return "CALLER_BUSY" end
            if redis.call("EXISTS", @calleeCallStateKey) == 1 then return "CALLEE_BUSY" end
            
            -- bound caller to the call
            redis.call("SET", @callerCallStateKey, @callId .. "#" .. @callerConnectionId, "EX", @ttl)
            redis.call("SET", @calleeCallStateKey, @callId, "EX", @ttl)
            
            redis.call("HSET", @callSessionKey, "type", "Direct", "status", "Ringing", "initiator", @callerId)
            redis.call("EXPIRE", @callSessionKey, @ttl)
            
            redis.call("HSET", @participantsKey, @callerId, "Joined", @calleeId, "Ringing")
            redis.call("EXPIRE", @participantsKey, @ttl)
            
            return "SUCCESS"
            """
        );

        AcceptDirectCallScript = LuaScript.Prepare(
            """
            local status = redis.call("HGET", @callSessionKey, "status")
            if not status or status ~= "Ringing" then return { "INVALID_STATE" } end
            
            local type = redis.call("HGET", @callSessionKey, "type")
            if not type or type ~= "Direct" then return { "INVALID_CALL_TYPE" } end
            
            local callerId = redis.call("HGET", @callSessionKey, "initiator")
            if not callerId then return { "INVALID_STATE" } end
            
            redis.call("HSET", @callSessionKey, "status", "Active", "at", @activeTime)
            redis.call("EXPIRE", @callSessionKey, @activeTtl)
            redis.call("HSET", @participantsKey, @calleeId, "Joined")
            redis.call("EXPIRE", @participantsKey, @activeTtl)
            
            -- bound callee to the call
            redis.call("SET", @calleeCallStateKey, @callId .. "#" .. @calleeConnectionId, "EX", @activeTtl)
            redis.call("EXPIRE", @calleeCallStateKey, @activeTtl)
            
            redis.call("EXPIRE", "user:{" .. callerId .. "}:call", @activeTtl)
            
            return { "SUCCESS", callerId }
            """
        );

        LeaveOrEndCallScript = LuaScript.Prepare(
            """
            redis.call("DEL", @userCallStateKey)
            redis.call("HDEL", @participantsKey, @userId)
            """
        );

        DropUserCallScript = LuaScript.Prepare(
            """
            local callState = redis.call("GET", @userCallStateKey);
            
            if not callState then
                return nil
            end
            
            local callId, boundConnectionId = string.match(callState, "([^#]+)#?(.*)")
            
            if boundConnectionId ~= nil and boundConnectionId ~= "" then
                --[[
                call state is bounded to specific connection instance, return instantly if disconnection
                come from any instance other than bounded id
                ]]
                
                if boundConnectionId ~= connectionId then
                    return nil
                end
            else
                -- call state is unbounded, only drop if all connection instances of the user is disconnected.
            
                if not @isLastConnection then
                    return nil
                end
            end
            
            local callSessionKey = 'call:{' .. callId .. '}:session'
            local participantsKey = 'call:{' .. callId .. '}:participants'
            
            local allParticipants = redis.call("HKEYS", participantsKey)
            local remainingPeers = {}
            
            for _, participantId in pairs(allParticipants) do
                if participantId ~= @userId then
                    table.insert(remainingPeers, pId)
                end
            end
            
            redis.call("DEL", @userCallStateKey);
            redis.call("HDEL", participantsKey, @userId);
            
            return { callId, remainingPeers }
            """
        );
    }

    public async Task<Result<Guid>> InitializeDirectCall(Guid callerId, string callerConnectionId, Guid calleeId) {
        Guid callId = Guid.NewGuid();

        var result = (string?)await _database.ScriptEvaluateAsync(InitializeDirectCallScript, new {
            callerId = callerId.ToString(),
            callerCallStateKey = GetUserCallStateKey(callerId),
            callerConnectionId,
            calleeId = calleeId.ToString(),
            calleeCallStateKey = GetUserCallStateKey(calleeId),
            callId = callId.ToString(),
            callSessionKey = GetCallSessionKey(callId),
            participantsKey = GetCallParticipantsKey(callId),
            ttl = RingingTimeoutSec,
        });
        
        return result switch {
            "SUCCESS" => Result<Guid>.Success(callId),
            "CALLER_BUSY" => Errors.AlreadyInCall(),
            "CALLEE_BUSY" => Errors.CalleeBusy(),
            _ => Errors.InvalidCallStates(),
        };
    }

    public async Task<Result<AcceptCallResult>> AcceptDirectCall(Guid callId, Guid calleeId, string calleeConnectionId) {
        var result = await _database.ScriptEvaluateAsync(AcceptDirectCallScript, new {
            callSessionKey = GetCallSessionKey(callId),
            participantsKey = GetCallParticipantsKey(callId),
            callId = callId.ToString(),
            calleeId = calleeId.ToString(),
            calleeCallStateKey = GetUserCallStateKey(calleeId),
            calleeConnectionId,
            activeTtl = ActiveCallTimeoutSec,
            activeTime = timeProvider.GetUtcNow().ToUnixTimeSeconds(),
        });
        
        var resultValues = (RedisResult[])result!;
        var status = (string)resultValues[0]!;

        if (status != "SUCCESS") {
            return Errors.InvalidCallStates();
        }

        var callerId = Guid.Parse((string)resultValues[1]!);

        return Result<AcceptCallResult>.Success(new(callerId));
    }

    public async Task<Result> LeaveOrEndCall(Guid callId, Guid userId) {
        await _database.ScriptEvaluateAsync(LeaveOrEndCallScript, new {
            userId = userId.ToString(),
            userCallStateKey = GetUserCallStateKey(userId),
            participantsKey = GetCallParticipantsKey(callId),
            callSessionKey = GetCallSessionKey(callId),
        });
        
        return Result.Success();
    }

    public async Task<Result<DropCallResult>> DropUserCall(Guid userId, string connectionId, bool isLastConnection) {
        var result = await _database.ScriptEvaluateAsync(DropUserCallScript, new {
            userCallStateKey = GetUserCallStateKey(userId),
            userId = userId.ToString(),
            connectionId,
            isLastConnection,
        });
        
        if (result.IsNull) {
            return Errors.ResourceNotFound();
        }
        
        var resultValues = (RedisResult[])result!;
        var callId = Guid.Parse((string)resultValues[0]!);
        var remainingPeerIds = ((RedisResult[])resultValues[1]!)
            .Select(x => Guid.Parse((string)x!))
            .ToList();
        
        return Result<DropCallResult>.Success(new(callId, remainingPeerIds));
    }

    public async Task<Guid?> GetUserActiveCallId(Guid userId) {
        return null;

        // var stateString = (string?)await _database.StringGetAsync(GetUserCallStateKey(userId));
        //
        // if (string.IsNullOrEmpty(stateString)) return null;
        //
        // int hashIndex = stateString.IndexOf('#');
        // return Guid.TryParse(hashIndex == -1 ? );
    }

    public async Task CleanCallStates() {
        // https://github.com/StackExchange/StackExchange.Redis/blob/main/docs/KeysScan.md
        var endpoint = connectionMultiplexer.GetEndPoints().First();
        var server = connectionMultiplexer.GetServer(endpoint);
        var db = connectionMultiplexer.GetDatabase();
        
        var keys = server.Keys(pattern: "call:state:*").ToArray();
        
        if (keys.Length > 0) {
            LogFoundCallStates(logger, keys.Length);
            await db.KeyDeleteAsync(keys);
            logger.LogInformation("Successfully wiped call states.");
        }
    }

    private static string GetUserCallStateKey(Guid userId) {
        return $"user:{{{userId}}}:call";
    }

    private static string GetCallSessionKey(Guid callId) {
        return $"call:{{{callId}}}:session";
    }

    private static string GetCallParticipantsKey(Guid callId) {
        return $"call:{{{callId}}}:participants";
    }
    
    [LoggerMessage(LogLevel.Information, "Found {c} call states in Redis. Wiping...")]
    private static partial void LogFoundCallStates(ILogger logger, int c);
}