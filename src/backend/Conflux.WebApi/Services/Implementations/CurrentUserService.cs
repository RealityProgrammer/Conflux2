using Conflux.Application.Services;
using System.Security.Claims;

namespace Conflux.WebApi.Services.Implementations;

internal sealed class CurrentUserService(
    IHttpContextAccessor httpContextAccessor
) : ICurrentUserService {
    public Guid? UserId {
        get {
            var claimValue = httpContextAccessor.HttpContext?.User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(claimValue, out var id) ? id : null;
        }
    }

    public bool IsAuthenticated => httpContextAccessor.HttpContext?.User.Identity?.IsAuthenticated ?? false;
}