using Conflux.Domain.Enums;
using Conflux.WebApi.GraphQL.Middlewares;
using HotChocolate.Types.Descriptors;
using System.Reflection;

namespace Conflux.WebApi.GraphQL.Attributes;

internal sealed class RequireServerPermissionsAttribute : ObjectFieldDescriptorAttribute {
    private ServerPermission[] _requirePermissions;
    
    public RequireServerPermissionsAttribute(params ServerPermission[] requirePermissions) {
        _requirePermissions = requirePermissions;
    }
    
    protected override void OnConfigure(
        IDescriptorContext context, 
        IObjectFieldDescriptor descriptor, 
        MemberInfo? member
    ) {
        descriptor.Use((next) => {
            RequireServerPermissionsMiddleware middleware = new(next, _requirePermissions);
            return async ctx => await middleware.InvokeAsync(ctx);
        });
    }
}