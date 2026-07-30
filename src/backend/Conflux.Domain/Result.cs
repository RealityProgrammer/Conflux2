namespace Conflux.Domain;

public readonly record struct Result {
    public bool IsSuccess { get; }
    public Error Error { get; }
    
    internal Result(bool isSuccess, Error error) {
        IsSuccess = isSuccess;
        Error = error;
    }
    
    public static Result Success() => new(true, default);
    
    public static Result Failure(Error error) => new(false, error);
    
    public static Result Failure(string errorCode, string errorMessage, object? details = null) {
        return new(false, new(errorCode, errorMessage, details));
    }

    public static implicit operator Result(Error error) => Failure(error);
}

public readonly record struct Result<T> {
    public bool IsSuccess { get; }
    public Error Error { get; }

    public T Value 
        => IsSuccess ? field : throw new InvalidOperationException("The value of a failure result can not be accessed.");
    
    private Result(bool isSuccess, T value, Error error) {
        IsSuccess = isSuccess;
        Value = value;
        Error = error;
    }

    public static Result<T> Success(T value) => new(true, value, default);
    
    public static Result<T> Failure(Error error) => new(false, default!, error);
    
    public static Result<T> Failure(string errorCode, string errorMessage) {
        return new(false, default!, new(errorCode, errorMessage));
    }

    public static implicit operator Result<T>(Error error) => Failure(error);

    public static implicit operator Result(Result<T> result) => new(result.IsSuccess, result.Error);
}