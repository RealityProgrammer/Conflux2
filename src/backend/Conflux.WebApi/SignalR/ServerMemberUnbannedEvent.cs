namespace Conflux.WebApi.SignalR;

public sealed record ServerMemberUnbannedEvent(Guid ServerId, Guid UnbannedMemberUserId, Guid UnbannedMemberId);