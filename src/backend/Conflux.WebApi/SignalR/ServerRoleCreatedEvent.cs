using Conflux.Application.Dto;

namespace Conflux.WebApi.SignalR;

public sealed record ServerRoleCreatedEvent(Guid ServerId, ServerRoleDto Role);