using Conflux.Application.Features.Conversation;
using Conflux.Application.Features.Friends;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.SignalR;

partial class GatewayHub {
    // invoked by frontend only
    // public async Task<Domain.Result<UserIdentityProfileDto>> StartDirectCall(Guid calleeUserId) {
    //     var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
    //
    //     if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var callerId)) {
    //         return Errors.InvalidIdentifier();
    //     }
    //
    //     return await sender.Send(new StartCallCommand(callerId, Context.ConnectionId, calleeUserId));
    // }

    // invoked by frontend only
    public async Task<Result> CancelDirectCall(Guid calleeUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var callerId)) {
            return Errors.InvalidIdentifier();
        }
        
        return await sender.Send(new CancelCallCommand(callerId, calleeUserId));
    }

    // invoked by frontend only
    public async Task<Result> DenyDirectCall(Guid callerUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var calleeId)) {
            return Errors.InvalidIdentifier();
        }
        
        return await sender.Send(new DenyCallCommand(callerUserId, calleeId));
    }

    // invoked by frontend only
    public async Task<Result> AcceptDirectCall(Guid callerUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var calleeUserId)) {
            return Errors.InvalidIdentifier();
        }

        return await sender.Send(new AcceptCallCommand(callerUserId, calleeUserId, Context.ConnectionId));
    }
    
    // invoked by frontend only
    public async Task<Result> EndDirectCall(Guid peerUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return Errors.InvalidIdentifier();
        }

        return await sender.Send(new EndCallCommand(userId, peerUserId));
    }
    
    // invoked by frontend only
    public async Task<Domain.Result<UserIdentityProfileDto>> GetCurrentRingingCall() {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return Errors.InvalidIdentifier();
        }

        return await sender.Send(new IncomingCallQuery(userId));
    }
    
    public async Task SendOffer(Guid targetUserId, string sdp) {
        await Clients.User(targetUserId.ToString()).ReceiveCallOffer(Context.UserIdentifier!, sdp);
    }

    public async Task SendAnswer(Guid targetUserId, string sdp) {
        await Clients.User(targetUserId.ToString()).ReceiveCallAnswer(Context.UserIdentifier!, sdp);
    }

    public async Task SendIceCandidate(Guid targetUserId, string candidate) {
        await Clients.User(targetUserId.ToString()).ReceiveIceCandidate(Context.UserIdentifier!, candidate);
    }
}