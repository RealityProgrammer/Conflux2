using Conflux.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using RedLockNet;
using System.Text.Json;

namespace Conflux.WebApi.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class IdempotentAttribute(int cacheTimeInMinutes) : Attribute, IAsyncActionFilter {
    private static readonly TimeSpan LockExpiry = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan LockWait = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan RetryWait = TimeSpan.FromSeconds(30);
    
    private readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(cacheTimeInMinutes);

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next) {
        if (!context.HttpContext.Request.Headers.TryGetValue("Idempotency-Key", out StringValues idempotenceKeyValue)) {
            context.Result = new BadRequestObjectResult(new ApiResponse(Errors.NoIdempotencyKeyHeader()));
            return;
        }

        IDistributedCache cache = context.HttpContext.RequestServices.GetRequiredService<IDistributedCache>();
        IDistributedLockFactory lockFactory = context.HttpContext.RequestServices.GetRequiredService<IDistributedLockFactory>();

        string cacheKey = $"Idempotent:{idempotenceKeyValue}";

        string? cached = await cache.GetStringAsync(cacheKey);
        if (cached is not null) {
            ReturnCachedResult(context, cached);

            return;
        }
        
        string lockResource = $"IdempotentLock:{idempotenceKeyValue}";
        
        await using var redLock = await lockFactory.CreateLockAsync(
            lockResource,
            LockExpiry,
            LockWait,
            RetryWait,
            cancellationToken: CancellationToken.None
        );
        
        if (!redLock.IsAcquired) {
            context.Result = await WaitForCachedResultAsync(context, cache, cacheKey);
            return;
        }
        
        cached = await cache.GetStringAsync(cacheKey);
        if (cached is not null) {
            ReturnCachedResult(context, cached);
            return;
        }

        ActionExecutedContext executedContext = await next();

        if (executedContext.Result is ObjectResult {
            StatusCode: >= 200 and < 300, 
            Value: not null,
        } objectResult) {
            var serializerOptions = context.HttpContext.RequestServices
                .GetRequiredService<IOptions<JsonOptions>>()
                .Value
                .JsonSerializerOptions;
            
            int statusCode = objectResult.StatusCode ?? StatusCodes.Status200OK;
            string jsonBody = JsonSerializer.Serialize(objectResult.Value, objectResult.Value.GetType(), serializerOptions);
            
            var idempotentResponse = new IdempotentResponse(jsonBody, statusCode);
            string serializedResponse = JsonSerializer.Serialize(idempotentResponse);

            await cache.SetStringAsync(
                cacheKey,
                serializedResponse,
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = _cacheDuration }
            );
        }
    }

    private static void ReturnCachedResult(ActionExecutingContext context, string cachedJson) {
        var serializerOptions = context.HttpContext.RequestServices
            .GetRequiredService<IOptions<JsonOptions>>()
            .Value
            .JsonSerializerOptions;
        
        var response = JsonSerializer.Deserialize<IdempotentResponse>(cachedJson, serializerOptions)!;
    
        context.Result = new ContentResult {
            Content = response.JsonBody,
            ContentType = "application/json",
            StatusCode = response.StatusCode,
        };
    }

    private static async Task<IActionResult> WaitForCachedResultAsync(
        ActionExecutingContext context, 
        IDistributedCache cache, 
        string cacheKey
    ) {
        // wait 30 seconds for the result to appear
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        
        while (!cts.IsCancellationRequested) {
            var cached = await cache.GetStringAsync(cacheKey, CancellationToken.None);
            if (cached is not null) {
                var serializerOptions = context.HttpContext.RequestServices
                    .GetRequiredService<IOptions<JsonOptions>>()
                    .Value
                    .JsonSerializerOptions;
                
                var response = JsonSerializer.Deserialize<IdempotentResponse>(cached, serializerOptions)!;
                
                return new ContentResult {
                    Content = response.JsonBody,
                    ContentType = "application/json",
                    StatusCode = response.StatusCode
                };
            }
            
            await Task.Delay(100, cts.Token);
        }

        return new StatusCodeResult(StatusCodes.Status503ServiceUnavailable);
    }
}