namespace Conflux.WebApi.SignalR;

public sealed record ServerMemberKickedEvent(Guid ServerId, Guid UserId, Guid MemberId);