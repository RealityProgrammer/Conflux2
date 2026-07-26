namespace Conflux.Application.Dto.Responses;

public enum SendFriendRequestResult {
    Requested,
    Friended,
    Failure,
}

public sealed record SendFriendRequestResponse(Guid RequestId, SendFriendRequestResult Result);