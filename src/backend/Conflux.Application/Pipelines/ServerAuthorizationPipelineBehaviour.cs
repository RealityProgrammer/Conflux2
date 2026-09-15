using Conflux.Application.Features;
using Conflux.Application.Features.Servers;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Pipelines;

public sealed class ServerAuthorizationPipelineBehaviour<TMessage, TResponse>(
    IServerPermissionsProvider permissionsProvider
) : IPipelineBehavior<TMessage, TResponse> where TMessage : IServerCommand where TResponse : IResult<TResponse> {
    public async ValueTask<TResponse> Handle(
        TMessage message, 
        MessageHandlerDelegate<TMessage, TResponse> next, 
        CancellationToken cancellationToken
    ) {
        var executorPermissionsResult = await permissionsProvider.GetUserAuthorizeInfo(message.ServerId, message.ExecutorUserId, cancellationToken);

        if (!executorPermissionsResult.IsSuccess) {
            return TResponse.Failure(executorPermissionsResult.Error);
        }

        IEnumerable<ServerPermission> requiredPermissions = message.RequiredPermissions;
        var executorEffectivePermissions = executorPermissionsResult.Value!.EffectivePermissions;
        
        switch (requiredPermissions) {
            // quick skip if the effective permissions map has less element than required permission (somehow)
            case ICollection<ServerPermission> collection when executorEffectivePermissions.Count < collection.Count:
            case IReadOnlyCollection<ServerPermission> readOnlyColl when executorEffectivePermissions.Count < readOnlyColl.Count:
                return TResponse.Failure(Errors.Forbidden("Insufficient permissions."));

            default:
                foreach (var permission in requiredPermissions) {
                    if (!executorEffectivePermissions.TryGetValue(permission, out bool isGranted) || !isGranted) {
                        return TResponse.Failure(Errors.Forbidden("Insufficient permissions."));
                    }
                }

                return await next(message, cancellationToken);
        }
    }
}