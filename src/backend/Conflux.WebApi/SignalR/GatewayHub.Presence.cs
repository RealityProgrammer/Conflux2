using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.SignalR;

partial class GatewayHub {
    // invoked by the frontend only
    public async Task SetAutoIdle(bool idle) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    
        if (!string.IsNullOrEmpty(idClaim) && Guid.TryParse(idClaim, out var userId)) {
            await presenceService.SetAutoIdle(userId, idle);
        }
    }
}