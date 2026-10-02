using Conflux.Application.Features.Friends;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.WebApi.Dto;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Conflux.WebApi.SignalR;

partial class GatewayHub {
    // invoked by frontend only
    public async Task<DirectCallContext> StartDirectCall(Guid calleeUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var callerId)) {
            return new(Errors.InvalidIdentifier(), null);
        }

        Domain.Result<UserIdentityProfileDto> calleeProfile = await sender.Send(new StartCallCommand(callerId, Context.ConnectionId, calleeUserId));

        if (!calleeProfile.IsSuccess) {
            return new(calleeProfile, null);
        }
        
        return new(Result.Success(), calleeProfile.Value);
    }

    // invoked by frontend only
    public async Task<DirectCallContext> CancelDirectCall(Guid calleeUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var callerId)) {
            return new(Errors.InvalidIdentifier(), null);
        }
        
        Result result = await sender.Send(new CancelCallCommand(callerId, calleeUserId));
        return new(result, null);
    }

    // invoked by frontend only
    public async Task<DirectCallContext> DenyDirectCall(Guid callerUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var calleeId)) {
            return new(Errors.InvalidIdentifier(), null);
        }
        
        Result result = await sender.Send(new DenyCallCommand(callerUserId, calleeId));
        return new(result, null);
    }

    // invoked by frontend only
    public async Task<DirectCallContext> AcceptDirectCall(Guid callerUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var calleeUserId)) {
            return new(Errors.InvalidIdentifier(), null);
        }

        Result result = await sender.Send(new AcceptCallCommand(callerUserId, calleeUserId, Context.ConnectionId));
        return new(result, null);
    }
    
    // invoked by frontend only
    public async Task<DirectCallContext> EndDirectCall(Guid peerUserId) {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return new(Errors.InvalidIdentifier(), null);
        }

        Result result = await sender.Send(new EndCallCommand(userId, peerUserId));
        return new(result, null);
    }
    
    // invoked by frontend only
    public async Task<DirectCallContext> GetCurrentRingingCall() {
        var idClaim = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
            return new(Errors.InvalidIdentifier(), null);
        }

        var peerIdResult = await callingService.GetCurrentRingingCall(userId);

        if (!peerIdResult.IsSuccess) {
            return new(peerIdResult, null);
        }

        // Fetch the peer's profile from your database so the UI can render their name/avatar
        var peerProfileResult = await userRepository.GetIdentityProfile(peerIdResult.Value);
        
        if (!peerProfileResult.IsSuccess) {
            return new(peerProfileResult, null);
        }

        return new(peerProfileResult, peerProfileResult.Value);
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