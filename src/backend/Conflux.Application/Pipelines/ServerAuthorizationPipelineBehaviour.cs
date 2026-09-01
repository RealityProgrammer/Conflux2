using Conflux.Application.Features.Commands;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Enums;

namespace Conflux.Application.Pipelines;

public sealed class ServerAuthorizationPipelineBehaviour<TMessage, TResponse>(
    IServerPermissionsProvider provider
) : IPipelineBehavior<TMessage, TResponse> where TMessage : IServerCommand where TResponse : IResult<TResponse> {
    async ValueTask<TResponse> IPipelineBehavior<TMessage, TResponse>.Handle(
        TMessage message, 
        MessageHandlerDelegate<TMessage, TResponse> next, 
        CancellationToken cancellationToken
    ) {
        var result = await provider.GetUserPermissions(message.ServerId, message.ExecutorUserId, cancellationToken);

        if (!result.IsSuccess) {
            return TResponse.Failure(result.Error);
        }

        IEnumerable<ServerPermission> requiredPermissions = message.RequiredPermissions;
        var effectivePermissions = result.Value!.EffectivePermissions;
        
        switch (requiredPermissions) {
            // quick skip if the effective permissions map has less element than required permission (somehow)
            case ICollection<ServerPermission> collection when effectivePermissions.Count < collection.Count:
            case IReadOnlyCollection<ServerPermission> readOnlyColl when effectivePermissions.Count < readOnlyColl.Count:
                return TResponse.Failure(Errors.Forbidden("Insufficient permissions."));

            default:
                foreach (var permission in requiredPermissions) {
                    if (!effectivePermissions.TryGetValue(permission, out bool isGranted) || !isGranted) {
                        return TResponse.Failure(Errors.Forbidden("Insufficient permissions."));
                    }
                }

                return await next(message, cancellationToken);
        }
    }
}