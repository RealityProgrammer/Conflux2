namespace Conflux.WebApi.Notifications.Messaging;

public sealed record UserTypingEvent(Guid UserId, string DisplayName, bool HasAvatar);