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
    private const int ActiveCallTimeoutSec = 12 * 60 * 60; // 12 hours
    
    private static readonly LuaScript 
        InitializeDirectCallScript, 
        AcceptDirectCallScript,
        CancelDirectCallScript,
        RejectDirectCallScript,
        DeleteDirectCallScript,
        EndDirectCallScript, 
        DropUserCallScript;

    static CallingService() {
        InitializeDirectCallScript = LuaScript.Prepare(
            """
            if redis.call("EXISTS", @callerCallStateKey) == 1 then return "CALLER_BUSY" end
            if redis.call("EXISTS", @calleeCallStateKey) == 1 then return "CALLEE_BUSY" end
            
            redis.call("SET", @callerCallStateKey, @callId .. "#" .. @callerConnectionId, "EX", @ttl)
            redis.call("SET", @calleeCallStateKey, @callId, "EX", @ttl)
            
            redis.call("HSET", @callSessionKey, "type", "Direct", "status", "Ringing", "initiator", @callerId, "callee", @calleeId)
            redis.call("EXPIRE", @callSessionKey, @ttl)
            
            return "SUCCESS"
            """
        );

        AcceptDirectCallScript = LuaScript.Prepare(
            """
            local type = redis.call("HGET", @callSessionKey, "type")
            if not type or type ~= "Direct" then return { "INVALID_CALL_TYPE" } end
            
            local status = redis.call("HGET", @callSessionKey, "status")
            if not status or status ~= "Ringing" then return { "INVALID_STATE" } end
            
            local callerId = redis.call("HGET", @callSessionKey, "initiator")
            if not callerId then return { "INVALID_STATE" } end
            
            local calleeId = redis.call("HGET", @callSessionKey, "callee")
            if not calleeId or calleeId ~= @calleeId then return { "INVALID_STATE" } end
            
            redis.call("HSET", @callSessionKey, "status", "Active", "activeTime", @activeTime)
            redis.call("EXPIRE", @callSessionKey, @activeTtl)
            
            -- bound callee to the call
            redis.call("SET", @calleeCallStateKey, @callId .. "#" .. @calleeConnectionId, "EX", @activeTtl)
            redis.call("EXPIRE", @calleeCallStateKey, @activeTtl)
            
            redis.call("EXPIRE", "user:{" .. callerId .. "}:call", @activeTtl)
            
            return { "SUCCESS", callerId }
            """
        );
        
        CancelDirectCallScript = LuaScript.Prepare(
            """
            local type = redis.call("HGET", @callSessionKey, "type")
            if not type or type ~= "Direct" then return { "INVALID_CALL_TYPE" } end

            local status = redis.call("HGET", @callSessionKey, "status")
            if not status or status ~= "Ringing" then return { "INVALID_STATE" } end

            local callerId = redis.call("HGET", @callSessionKey, "initiator")
            if not callerId or callerId ~= @callerId then return { "INVALID_STATE" } end

            local calleeId = redis.call("HGET", @callSessionKey, "callee")

            redis.call("DEL", @callSessionKey)
            redis.call("DEL", "user:{" .. callerId .. "}:call")
            redis.call("DEL", "user:{" .. calleeId .. "}:call")

            return { "SUCCESS", calleeId }
            """
        );
        
        RejectDirectCallScript = LuaScript.Prepare(
            """
            local type = redis.call("HGET", @callSessionKey, "type")
            if not type or type ~= "Direct" then return { "INVALID_CALL_TYPE" } end

            local status = redis.call("HGET", @callSessionKey, "status")
            if not status or status ~= "Ringing" then return { "INVALID_STATE" } end

            local calleeId = redis.call("HGET", @callSessionKey, "callee")
            if not calleeId or calleeId ~= @calleeId then return { "INVALID_STATE" } end

            local callerId = redis.call("HGET", @callSessionKey, "initiator")

            redis.call("DEL", @callSessionKey)
            redis.call("DEL", "user:{" .. callerId .. "}:call")
            redis.call("DEL", "user:{" .. calleeId .. "}:call")

            return { "SUCCESS", callerId }
            """
        );

        DeleteDirectCallScript = LuaScript.Prepare(
            """
            local type = redis.call("HGET", @callSessionKey, "type")
            if not type or type ~= "Direct" then return "INVALID_CALL_TYPE" end
            
            local callerId = redis.call("HGET", @callSessionKey, "initiator")
            local calleeId = redis.call("HGET", @callSessionKey, "callee")
            
            redis.call("DEL", @callSessionKey)
            redis.call("DEL", "user:{" .. callerId .. "}:call")
            redis.call("DEL", "user:{" .. calleeId .. "}:call")
            
            return "SUCCESS"
            """
        );

        EndDirectCallScript = LuaScript.Prepare(
            """
            local type = redis.call("HGET", @callSessionKey, "type")
            if not type or type ~= "Direct" then return { "INVALID_CALL_TYPE" } end
            
            local status = redis.call("HGET", @callSessionKey, "status")
            if not status or status ~= "Active" then return { "INVALID_STATE" } end
            
            local callerId = redis.call("HGET", @callSessionKey, "initiator")
            local calleeId = redis.call("HGET", @callSessionKey, "callee")
            
            if not callerId or not calleeId then return { "INVALID_STATE" } end
            if callerId ~= @userId and calleeId ~= @userId then return { "INVALID_STATE" } end
            
            local startTime = redis.call("HGET", @callSessionKey, "activeTime")
            
            redis.call("DEL", @callSessionKey)
            redis.call("DEL", "user:{" .. callerId .. "}:call")
            redis.call("DEL", "user:{" .. calleeId .. "}:call")
            
            local peerId = callerId == @userId and calleeId or callerId;
            return { "SUCCESS", peerId, @currentTime - startTime }
            """
        );

        DropUserCallScript = LuaScript.Prepare(
            """
            local callState = redis.call("GET", @userCallStateKey);
            if not callState then return nil end
            
            local callId, boundConnectionId = string.match(callState, "([^#]+)#?(.*)")
            
            if boundConnectionId ~= nil and boundConnectionId ~= "" then
                --[[
                call state is bounded to specific connection instance, return instantly if disconnection
                come from any instance other than bounded id
                ]]
                
                if boundConnectionId ~= @connectionId then
                    return nil
                end
            else
                -- call state is unbounded (ringing), only drop if all connection instances of the user is disconnected.
            
                if not @isLastConnection then
                    return nil
                end
            end
            
            local callSessionKey = 'call:{' .. callId .. '}:session'
            local callType = redis.call("HGET", callSessionKey, "type")
            
            if not callType or callType ~= "Direct" then
                redis.call("DEL", @userCallStateKey)
                return nil
            end
            
            local callerId = redis.call("HGET", callSessionKey, "initiator")
            local calleeId = redis.call("HGET", callSessionKey, "callee")
            
            if not callerId or not calleeId then
                redis.call("DEL", callSessionKey)
                redis.call("DEL", @userCallStateKey)
                return nil
            end
            
            local peerId = nil
            if @userId == callerId then
                peerId = calleeId
            elseif @userId == calleeId then
                peerId = callerId
            else
                return nil
            end
            
            redis.call("DEL", callSessionKey)
            redis.call("DEL", "user:{" .. callerId .. "}:call")
            redis.call("DEL", "user:{" .. calleeId .. "}:call")
            
            return { callId, peerId }
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
        return Result<AcceptCallResult>.Success(new(callId, callerId));
    }

    public async Task<Result> DeleteDirectCall(Guid callId) {
        var result = (string?)await _database.ScriptEvaluateAsync(DeleteDirectCallScript, new {
            callSessionKey = GetCallSessionKey(callId),
        });

        return result == "SUCCESS" ? Result.Success() : Errors.InvalidCallStates();
    }

    public async Task<Result<CancelDirectCallResult>> CancelDirectCall(Guid callId, Guid callerId) {
        var result = await _database.ScriptEvaluateAsync(CancelDirectCallScript, new {
            callSessionKey = GetCallSessionKey(callId),
            callerId = callerId.ToString(),
        });
        
        var resultValues = (RedisResult[])result!;
        var status = (string)resultValues[0]!;

        if (status != "SUCCESS") {
            return Errors.InvalidCallStates();
        }
        
        var calleeId = Guid.Parse((string)resultValues[1]!);
        return Result<CancelDirectCallResult>.Success(new(callId, calleeId));
    }
    
    public async Task<Result<RejectDirectCallResult>> RejectDirectCall(Guid callId, Guid calleeId) {
        var result = await _database.ScriptEvaluateAsync(RejectDirectCallScript, new {
            callSessionKey = GetCallSessionKey(callId),
            calleeId = calleeId.ToString(),
        });
        
        var resultValues = (RedisResult[])result!;
        var status = (string)resultValues[0]!;

        if (status != "SUCCESS") {
            return Errors.InvalidCallStates();
        }
        
        var callerId = Guid.Parse((string)resultValues[1]!);
        return Result<RejectDirectCallResult>.Success(new(callId, callerId));
    }

    public async Task<Result<EndDirectCallResult>> EndDirectCall(Guid callId, Guid enderId) {
        var result = await _database.ScriptEvaluateAsync(EndDirectCallScript, new {
            callSessionKey = GetCallSessionKey(callId),
            userId = enderId.ToString(),
            currentTime = timeProvider.GetUtcNow().ToUnixTimeSeconds(),
        });
        
        var resultValues = (RedisResult[])result!;
        var status = (string)resultValues[0]!;

        if (status != "SUCCESS") {
            return Errors.InvalidCallStates();
        }
        
        var peerId = Guid.Parse((string)resultValues[1]!);
        var callDuration = (int)resultValues[2];
        
        return Result<EndDirectCallResult>.Success(new(callId, peerId, TimeSpan.FromSeconds(callDuration)));
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
        var peerId = Guid.Parse((string)resultValues[1]!);
        
        return Result<DropCallResult>.Success(new(callId, peerId));
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
        
        var keys = server.Keys(pattern: "user:*:call").ToArray();
        
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
    
    [LoggerMessage(LogLevel.Information, "Found {c} call states in Redis. Wiping...")]
    private static partial void LogFoundCallStates(ILogger logger, int c);
}