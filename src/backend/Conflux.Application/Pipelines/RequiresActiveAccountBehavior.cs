using Conflux.Application.Features;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Pipelines;

internal sealed class RequiresActiveAccountBehavior<TMessage, TResponse>(
    ICurrentUserService currentUserService,
    IAccountDeleteStatusCacheProvider accountDeleteStatusCacheProvider
) : IPipelineBehavior<TMessage, TResponse> where TMessage : IMessage where TResponse : IResult<TResponse> {
    public async ValueTask<TResponse> Handle(
        TMessage request, 
        MessageHandlerDelegate<TMessage, TResponse> next, 
        CancellationToken cancellationToken)
    {
        if (request is IAllowNonActiveAccount) {
            return await next(request, cancellationToken);
        }
        
        if (currentUserService.UserId is not { } userId) {
            return TResponse.Failure(Errors.InvalidIdentifier());
        }

        AccountDeletionStatus status = 
            await accountDeleteStatusCacheProvider.Check(userId, cancellationToken);

        if (status != AccountDeletionStatus.None) {
            return TResponse.Failure(Errors.RequireActiveAccount());
        }
        
        return await next(request, cancellationToken);
    }
}