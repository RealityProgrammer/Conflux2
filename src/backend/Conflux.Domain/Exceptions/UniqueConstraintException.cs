namespace Conflux.Domain.Exceptions;

public sealed class UniqueConstraintException : Exception {
    public UniqueConstraintException(string message) : base(message) { }
    public UniqueConstraintException(string message, Exception innerException) : base(message, innerException) { }
}