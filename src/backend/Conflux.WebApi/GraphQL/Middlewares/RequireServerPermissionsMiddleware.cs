using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.WebApi.Helpers;
using HotChocolate.Resolvers;
using Microsoft.IdentityModel.JsonWebTokens;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.GraphQL.Middlewares;

internal sealed class RequireServerPermissionsMiddleware(FieldDelegate next, IEnumerable<ServerPermission> requiredPermissions) {
    public async Task InvokeAsync(IMiddlewareContext context) {
        var httpContext = context.Service<IHttpContextAccessor>().HttpContext;

        if (httpContext == null) {
            throw new GraphQLException(ErrorBuilder.New().SetMessage("HttpContext is null.").Build());
        }
        
        var idClaim = httpContext.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out Guid userId)) {
            throw new GraphQLException(Errors.InvalidIdentifier().ToHotChocolateError());
        }
        
        Guid serverId = Guid.Empty;
        
        // extract the server id from the parent server 
        if (context.Parent<CommunityServerMember>() is { } member) {
            serverId = member.CommunityServerId;    // if Guid.Empty is 0
        }
        else if (context.ArgumentValue<Guid?>("serverId") is { } serverIdArgument) {
            // hope the argument exists
            serverId = serverIdArgument;
        }

        if (serverId == Guid.Empty) {
            throw new GraphQLException(ErrorBuilder.New().SetMessage("Failed to extract server ID.").Build());
        }

        var permissionsProvider = context.Service<IServerPermissionsProvider>();

        var result = await permissionsProvider.GetUserAuthorizeInfo(serverId, userId, context.RequestAborted);
        if (!result.IsSuccess) {
            throw new GraphQLException(result.Error.ToHotChocolateError());
        }

        var userEffectivePermissions = result.Value!.EffectivePermissions;
        
        foreach (var permission in requiredPermissions) {
            if (!userEffectivePermissions.TryGetValue(permission, out bool isGranted) || !isGranted) {
                throw new GraphQLException(Errors.Forbidden("Insufficient permissions.").ToHotChocolateError());
            }
        }

        await next(context);
    }
}