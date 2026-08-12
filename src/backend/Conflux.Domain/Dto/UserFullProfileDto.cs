namespace Conflux.Domain.Dto;

public sealed record UserFullProfileDto(
    Guid Id, 
    string UserName,
    string DisplayName,
    bool HasAvatar,
    DateTimeOffset JoinedDate,
    DateTimeOffset? FriendedDate,
    string Pronouns,
    string Biography,
    int MutualFriendCount,
    int MutualServerCount
);