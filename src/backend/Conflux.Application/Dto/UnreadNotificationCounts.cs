namespace Conflux.Application.Dto;

/// <summary>
/// Get unread notification counts.
/// </summary>
/// <param name="DmMentionCounts">
///     Stores the counts of mentioning in user Direct Messages. Key are peer user id.
/// </param>
/// <param name="Servers">
///     Store the counts of mentioning in server. Key are server id.
/// </param>
public sealed record UnreadNotificationCounts(
    IReadOnlyDictionary<Guid, int> DmMentionCounts,
    IReadOnlyDictionary<Guid, IReadOnlyDictionary<Guid, ServerChannelNotificationCounts>> Servers
);

public sealed record UserNotificationCounts(int MentionsCount);

public sealed record ServerChannelNotificationCounts(int MentionsCount);