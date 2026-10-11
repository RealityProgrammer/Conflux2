namespace Conflux.WebApi.Notifications.Conversation;

public sealed record UserTypingEvent(Guid UserId, string DisplayName, int? AvatarRevision);