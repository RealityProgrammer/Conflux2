using Conflux.Domain;

namespace Conflux.Application.Pipelines;

public sealed class ValidationBehavior<TRequest, TResponse>(
    IEnumerable<IValidator<TRequest>> validators
) : IPipelineBehavior<TRequest, TResponse> where TRequest : IMessage where TResponse : IResult<TResponse> {
    public async ValueTask<TResponse> Handle(
        TRequest message, 
        MessageHandlerDelegate<TRequest, TResponse> next, 
        CancellationToken cancellationToken
    ) {
        if (!validators.Any()) {
            return await next(message, cancellationToken);
        }
        
        var context = new ValidationContext<TRequest>(message);
        
        ValidationResult[] validationResults = await Task.WhenAll(
            validators.Select(v => v.ValidateAsync(context, cancellationToken))
        );
        
        var errors = validationResults
            .SelectMany(r => r.Errors)
            .Where(f => f != null)
            .GroupBy(failure => failure.PropertyName, failure => failure.ErrorMessage)
            .ToDictionary(group => group.Key, group => group.ToArray());

        if (errors.Count > 0) {
            return TResponse.Failure(Errors.ValidationErrorsOccurred(errors));
        }
        
        return await next(message, cancellationToken);
    }
}