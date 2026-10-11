using Conflux.Application.Enums;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class RolePermissionObjectType : ObjectType<RolePermission> {
    protected override void Configure(IObjectTypeDescriptor<RolePermission> descriptor) {
        descriptor.BindFieldsExplicitly();
        
        descriptor.Field(r => r.RoleId);
        descriptor.Field(r => r.Role).Type<NonNullType<CommunityServerRoleObjectType>>();
        descriptor.Field(r => r.Permission).Type<NonNullType<EnumType<ServerPermission>>>();
        descriptor.Field(r => r.State).Type<NonNullType<EnumType<PermissionState>>>();
    }
}