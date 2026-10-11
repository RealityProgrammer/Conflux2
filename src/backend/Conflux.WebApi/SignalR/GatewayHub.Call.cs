namespace Conflux.WebApi.SignalR;

partial class GatewayHub {
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