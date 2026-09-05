using Conflux.Domain.Enums;

namespace Conflux.WebApi.GraphQL.Dto;

public sealed record PermissionEntry(ServerPermission Permission, bool IsGranted);