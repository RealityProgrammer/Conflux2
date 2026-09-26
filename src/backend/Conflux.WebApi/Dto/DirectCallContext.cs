using Conflux.Domain.Dto;

namespace Conflux.WebApi.Dto;

public enum CallResult {
    Success,
    Unauthorized,
    Unfriended,
}

public sealed record DirectCallContext(CallResult Result, UserIdentityProfileDto? CalleeProfile);