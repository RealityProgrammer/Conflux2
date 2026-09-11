namespace Conflux.Domain;

public interface IResult {
    bool IsSuccess { get; }
    Error Error { get; }
    
    object? GetValue();
}

public interface IResult<out TResult> : IResult {
    static abstract TResult Failure(Error error);
}