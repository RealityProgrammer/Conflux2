using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.Miscs;

internal sealed class JwtUserIdProvider : IUserIdProvider {
    public string? GetUserId(HubConnectionContext connection) {
        string? subName = connection.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        string? nameIdentifier = connection.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        return subName ?? nameIdentifier;
    }
}