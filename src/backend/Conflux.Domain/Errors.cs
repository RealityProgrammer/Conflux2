namespace Conflux.Domain;

public static class Errors {
    public static Error MismatchPasswords() =>
        new(nameof(MismatchPasswords), "Passwords are mismatch.");
    
    public static Error InvalidCredentials() => 
        new(nameof(InvalidCredentials), "Invalid credentials.");
    
    public static Error InvalidCredentials(string serviceName) => 
        new(nameof(InvalidCredentials), $"Invalid {serviceName} credentials.");

    public static Error NoUserFoundFromEmail() => 
        new(nameof(NoUserFoundFromEmail), "No user found from the provided email address.");
    
    public static Error EmailAttachedToAccount() => 
        new(nameof(NoUserFoundFromEmail), "Email attached to an existing account.");
    
    public static Error NoUserFoundFromId() => 
        new(nameof(NoUserFoundFromId), "No user found from the provided ID.");

    public static Error InvalidRefreshToken() =>
        new(nameof(InvalidRefreshToken), "Invalid refresh token.");
    
    public static Error ExpiredRefreshToken() =>
        new(nameof(ExpiredRefreshToken), "Expired refresh token.");

    public static Error UserAlreadyVerified() =>
        new(nameof(UserAlreadyVerified), "User is already verified.");
    
    public static Error UnexpectedError() =>
        new(nameof(UnexpectedError), "Unexpected error happened.");
    
    public static Error InvalidConfirmationCode() =>
        new(nameof(InvalidConfirmationCode), "Invalid confirmation code.");

    public static Error AntiforgeryTokenVerificationFailed() =>
        new(nameof(AntiforgeryTokenVerificationFailed), "Anti-forgery token verification failed.");

    public static Error ValidationErrorsOccured(Dictionary<string, string[]> fieldErrors) =>
        new(nameof(ValidationErrorsOccured), "One or more validation errors occurred.", fieldErrors);
    
    public static Error MissingConfiguration(string path) =>
        new(nameof(MissingConfiguration), $"Missing configuration {path}.");
    
    public static Error ConnectionFailure(string toWhere) =>
        new(nameof(ConnectionFailure), $"Failed to establish connection to {toWhere}.");
    
    public static Error OperationFailure(string doWhat) =>
        new(nameof(ConnectionFailure), $"Failed to {doWhat}.");

    public static Error Discontinued(string description) => new(nameof(Discontinued), description);

    public static Error ResourceNotFound() =>
        new(nameof(ResourceNotFound), $"Resource not found.");
    
    public static Error ResourceNotFound(string typeOfResource) =>
        new(nameof(ResourceNotFound), $"{typeOfResource} not found.");

    public static Error MissingArgument(string argumentName) =>
        new(nameof(MissingArgument), $"{argumentName} is missing.");

    public static Error InvalidIdentifier() =>
        new(nameof(InvalidIdentifier), "Invalid identifier.");

    public static Error WaitingForAcceptance() =>
        new(nameof(WaitingForAcceptance), "Receiver is waiting for acceptance on their side.");
    
    public static Error AlreadyFriended() =>
        new(nameof(WaitingForAcceptance), "Already friended.");
    
    public static Error FriendRequestCanceled() =>
        new(nameof(FriendRequestCanceled), "Friend request has been canceled.");
    
    public static Error FriendRequestRejected() =>
        new(nameof(FriendRequestRejected), "Friend request has been rejected.");
    
    public static Error Unauthorized(string description) =>
        new(nameof(Unauthorized), description);
    
    public static Error DisallowSelfAction(string description) =>
        new(nameof(DisallowSelfAction), description);

    public static Error NotFriend() =>
        new(nameof(NotFriend), "Users are not friend.");
    
    public static Error NoFriendRequest() =>
        new(nameof(NoAcceptedFriendRequest), "No friend request between 2 users.");

    public static Error NoAcceptedFriendRequest() =>
        new(nameof(NoAcceptedFriendRequest), "No accepted friend request between 2 users.");
    
    public static Error NoChannelWithId() =>
        new(nameof(NoDirectMessageChannelWithId), "No channel with the given ID.");

    public static Error NoDirectMessageChannelWithId() =>
        new(nameof(NoDirectMessageChannelWithId), "No direct message channel with the given ID.");

    public static Error AttachmentUploadFailure() =>
        new(nameof(AttachmentUploadFailure), "Failed to upload attachments.");
    
    public static Error EmptyMessageContent() =>
        new(nameof(EmptyMessageContent), "Empty message content.");
    
    public static Error Forbidden(string message) =>
        new(nameof(Forbidden), message);
}