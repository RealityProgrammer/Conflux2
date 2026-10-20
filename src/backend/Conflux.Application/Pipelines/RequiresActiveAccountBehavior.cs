using Conflux.Application.Features;
using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Pipelines;

internal sealed class RequiresActiveAccountBehavior<TMessage, TResponse>(
    ICurrentUserService currentUserService,
    IPendingDeleteAccountCacheProvider pendingDeleteAccountCacheProvider
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

        bool isDeleting = await pendingDeleteAccountCacheProvider.Check(userId, cancellationToken);

        if (isDeleting) {
            return TResponse.Failure(Errors.RequireActiveAccount());
        }
        
        return await next(request, cancellationToken);
    }
}