using Conflux.Domain.Enums;
using Conflux.WebApi.GraphQL.Middlewares;
using HotChocolate.Types.Descriptors;
using System.Reflection;

namespace Conflux.WebApi.GraphQL.Attributes;

internal sealed class RequireServerPermissionsAttribute(params ServerPermission[] requirePermissions) : ObjectFieldDescriptorAttribute {
    protected override void OnConfigure(
        IDescriptorContext context, 
        IObjectFieldDescriptor descriptor, 
        MemberInfo? member
    ) {
        descriptor.Use((_, next) => new RequireServerPermissionsMiddleware(next, requirePermissions));
    }
}