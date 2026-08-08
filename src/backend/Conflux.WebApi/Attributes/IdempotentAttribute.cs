using Conflux.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Primitives;
using RedLockNet;
using System.Text.Json;

namespace Conflux.WebApi.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public sealed class IdempotentAttribute : Attribute, IAsyncActionFilter {
    private static readonly TimeSpan LockExpiry = TimeSpan.FromSeconds(30);
    private static readonly TimeSpan LockWait = TimeSpan.FromSeconds(15);
    private static readonly TimeSpan RetryWait = TimeSpan.FromSeconds(30);
    
    private readonly TimeSpan _cacheDuration;

    public IdempotentAttribute(int cacheTimeInMinutes) {
        _cacheDuration = TimeSpan.FromMinutes(cacheTimeInMinutes);
    }

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
            context.Result = await WaitForCachedResultAsync(cache, cacheKey);
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
            Value: ApiResponse apiResponse,
        } objectResult) {
            int statusCode = objectResult.StatusCode ?? StatusCodes.Status200OK;
            var idempotentResponse = new IdempotentResponse(apiResponse, statusCode);

            await cache.SetStringAsync(
                cacheKey,
                JsonSerializer.Serialize(idempotentResponse),
                new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = _cacheDuration }
            );
        }
    }

    private static void ReturnCachedResult(ActionExecutingContext context, string cachedJson) {
        var response = JsonSerializer.Deserialize<IdempotentResponse>(cachedJson)!;
        
        context.Result = new ObjectResult(response.ApiResponse) {
            StatusCode = response.StatusCode,
        };
    }

    private static async Task<IActionResult> WaitForCachedResultAsync(IDistributedCache cache, string cacheKey) {
        // wait 30 seconds for the result to appear
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        
        while (!cts.IsCancellationRequested) {
            var cached = await cache.GetStringAsync(cacheKey, CancellationToken.None);
            if (cached is not null) {
                var response = JsonSerializer.Deserialize<IdempotentResponse>(cached);
                
                return new ObjectResult(response!.ApiResponse) {
                    StatusCode = response.StatusCode
                };
            }
            
            await Task.Delay(100, cts.Token);
        }

        return new StatusCodeResult(StatusCodes.Status503ServiceUnavailable);
    }
}