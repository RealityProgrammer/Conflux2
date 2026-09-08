namespace Conflux.WebApi.SignalR;

public sealed record MemberRolesUpdatedEvent(
    Guid ServerId,
    Guid MemberUserId
);