namespace Conflux.Application.Dto.Responses;

public enum SendFriendRequestResult {
    Requested,
    Friended,
    Failure,
}

public record SendFriendRequestResponse(SendFriendRequestResult Result);