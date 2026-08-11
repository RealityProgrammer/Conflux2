namespace Conflux.WebApi.SignalR;

public sealed record UpdateDmConversationListEvent(
    Guid ChannelId, 
    int UnreadCount
);