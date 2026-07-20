namespace Conflux.Application;

public static class Errors {
    public static Error MismatchPasswords() =>
        new(nameof(MismatchPasswords), "Passwords are mismatch.", null);
    
    public static Error InvalidCredentials() => 
        new(nameof(InvalidCredentials), "Invalid credentials.", null);
    
    public static Error InvalidCredentials(string serviceName) => 
        new(nameof(InvalidCredentials), $"Invalid {serviceName} credentials.", null);

    public static Error NoUserFoundFromEmail() => 
        new(nameof(NoUserFoundFromEmail), "No user found from the provided email address.", null);
    
    public static Error NoUserFoundFromId() => 
        new(nameof(NoUserFoundFromId), "No user found from the provided ID.", null);

    public static Error InvalidRefreshToken() =>
        new(nameof(InvalidRefreshToken), "Invalid refresh token.", null);

    public static Error UserAlreadyVerified() =>
        new(nameof(UserAlreadyVerified), "User is already verified.", null);
    
    public static Error UnexpectedError() =>
        new(nameof(UnexpectedError), "Unexpected error happened.", null);
    
    public static Error InvalidConfirmationCode() =>
        new(nameof(InvalidConfirmationCode), "Invalid confirmation code.", null);

    public static Error AntiforgeryTokenVerificationFailed() =>
        new(nameof(AntiforgeryTokenVerificationFailed), "Anti-forgery token verification failed.", null);

    public static Error ValidationErrorsOccured(Dictionary<string, string[]> fieldErrors) =>
        new(nameof(ValidationErrorsOccured), "One or more validation errors occurred.", fieldErrors);
    
    public static Error MissingConfiguration(string path) =>
        new(nameof(MissingConfiguration), $"Missing configuration {path}.", null);
    
    public static Error ConnectionFailure(string toWhere) =>
        new(nameof(ConnectionFailure), $"Failed to establish connection to {toWhere}.", null);
    
    public static Error OperationFailure(string doWhat) =>
        new(nameof(ConnectionFailure), $"Failed to {doWhat}.", null);

    public static Error Discontinued(string description) => new(nameof(Discontinued), description, null);

    public static Error ResourceNotFound(string typeOfResource) =>
        new(nameof(ResourceNotFound), $"{typeOfResource} not found.", null);

    public static Error MissingArgument(string argumentName) =>
        new(nameof(MissingArgument), $"{argumentName} is missing.", null);

    public static Error InvalidIdentifier() =>
        new(nameof(InvalidIdentifier), "Invalid identifier.", null);
}