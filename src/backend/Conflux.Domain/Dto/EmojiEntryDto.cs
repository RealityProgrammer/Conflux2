using MemoryPack;

namespace Conflux.Domain.Dto;

[MemoryPackable]
public sealed partial record EmojiEntryDto(Guid Id, string ShortCode);