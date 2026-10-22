using Conflux.Application.Services;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.Services.Implementations;

internal sealed class CurrentUserService(
    IHttpContextAccessor httpContextAccessor
) : ICurrentUserService {
    public Guid? UserId {
        get {
            var claimValue = httpContextAccessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
            return Guid.TryParse(claimValue, out var id) ? id : null;
        }
    }

    public Guid? SessionId {
        get {
            var claimValue = httpContextAccessor.HttpContext?.User.FindFirstValue(JwtRegisteredClaimNames.Sid);
            return Guid.TryParse(claimValue, out var id) ? id : null;
        }
    }

    public bool IsAuthenticated => httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}