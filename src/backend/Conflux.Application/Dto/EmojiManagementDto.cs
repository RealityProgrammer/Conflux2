namespace Conflux.Application.Dto;

public sealed record EmojiManagementCreatorDto(
    Guid UserId,
    string DisplayName,
    int? AvatarVersion
);

public sealed record EmojiManagementDto(
    Guid Id, 
    string ShortCode, 
    DateTimeOffset CreatedAt,
    EmojiManagementCreatorDto Creator
);