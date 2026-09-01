namespace Conflux.Domain;

public interface IResult<TResult> {
    static abstract TResult Failure(Error error);
}