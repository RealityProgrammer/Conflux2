using Conflux.Domain.Enums;

namespace Conflux.Domain.Dto;

public sealed record ReactionIconSource(
    ReactionIconSourceType SourceType,
    string? UnicodeValue,
    Guid? EmojiId
);