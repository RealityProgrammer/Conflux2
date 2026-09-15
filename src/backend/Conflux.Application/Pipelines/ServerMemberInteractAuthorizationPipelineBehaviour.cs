using Conflux.Application.Features;
using Conflux.Application.Features.Servers;
using Conflux.Application.Services;
using Conflux.Domain;

namespace Conflux.Application.Pipelines;

public class ServerMemberInteractAuthorizationPipelineBehaviour<TMessage, TResponse>(
    IServerPermissionsProvider permissionsProvider
) : IPipelineBehavior<TMessage, TResponse> where TMessage : IServerMemberInteractCommand where TResponse : IResult<TResponse> {
    public async ValueTask<TResponse> Handle(
        TMessage message, 
        MessageHandlerDelegate<TMessage, TResponse> next, 
        CancellationToken cancellationToken
    ) {
        var executorPermissionsResult = await permissionsProvider.GetUserAuthorizeInfo(message.ServerId, message.ExecutorUserId, cancellationToken);
        if (!executorPermissionsResult.IsSuccess) {
            return TResponse.Failure(executorPermissionsResult.Error);
        }

        var interactingMemberPermissionsResult = await permissionsProvider.GetMemberAuthorizeInfo(message.ServerId, message.InteractingMemberId, cancellationToken);
        if (!interactingMemberPermissionsResult.IsSuccess) {
            return TResponse.Failure(interactingMemberPermissionsResult.Error);
        }

        if (executorPermissionsResult.Value!.AuthorizeLevel < interactingMemberPermissionsResult.Value!.AuthorizeLevel) {
            return TResponse.Failure(Errors.Forbidden("Executor's authorize level must be greater or equals to authorize level of interacting member."));
        }
        
        return await next(message, cancellationToken);
    }
}