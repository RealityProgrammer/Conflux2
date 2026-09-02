namespace Conflux.WebApi.SignalR;

public sealed record ServerChannelDeletedEvent(Guid ServerId, Guid ChannelId);