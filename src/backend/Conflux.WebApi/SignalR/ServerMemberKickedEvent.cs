namespace Conflux.WebApi.SignalR;

public sealed record ServerMemberKickedEvent(Guid ServerId, Guid KickedMemberUserId, Guid KickedMemberId);