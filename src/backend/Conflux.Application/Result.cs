namespace Conflux.Application;

public readonly record struct Result {
    public bool IsSuccess { get; }
    public Error Error { get; }
    
    private Result(bool isSuccess, Error error) {
        IsSuccess = isSuccess;
        Error = error;
    }
    
    public static Result Success() => new(true, default);
    
    public static Result Failure(Error error) => new(false, error);
    
    public static Result Failure(string errorCode, string errorMessage) {
        return new(false, new(errorCode, errorMessage));
    }
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
}