using MemoryPack;

namespace Conflux.Application.Dto;

[MemoryPackable]
public sealed partial record EmojiListItemDto(Guid Id, string ShortCode);