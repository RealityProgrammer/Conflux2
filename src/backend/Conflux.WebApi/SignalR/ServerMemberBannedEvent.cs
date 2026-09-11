namespace Conflux.WebApi.SignalR;

public sealed record ServerMemberBannedEvent(Guid ServerId, Guid BannedMemberUserId, Guid BannedMemberId);