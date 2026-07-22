namespace Conflux.Application;

public static class Errors {
    public static Error MismatchPasswords() =>
        new(nameof(MismatchPasswords), "Passwords are mismatch.");
    
    public static Error InvalidCredentials() => 
        new(nameof(InvalidCredentials), "Invalid credentials.");
    
    public static Error InvalidCredentials(string serviceName) => 
        new(nameof(InvalidCredentials), $"Invalid {serviceName} credentials.");

    public static Error NoUserFoundFromEmail() => 
        new(nameof(NoUserFoundFromEmail), "No user found from the provided email address.");
    
    public static Error NoUserFoundFromId() => 
        new(nameof(NoUserFoundFromId), "No user found from the provided ID.");

    public static Error InvalidRefreshToken() =>
        new(nameof(InvalidRefreshToken), "Invalid refresh token.");

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
    
    public static Error ResourceInvalidState(string resourceName, string stateName) =>
        new(nameof(ResourceInvalidState), $"{resourceName} is having invalid {stateName}.");
}