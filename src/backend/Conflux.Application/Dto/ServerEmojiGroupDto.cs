using Conflux.Domain.Dto;

namespace Conflux.Application.Dto;

public sealed record ServerEmojiGroupInfoDto(Guid ServerId, string Name);

public sealed record ServerEmojiGroupDto(ServerEmojiGroupInfoDto ServerInfo, List<EmojiEntryDto> EmojiEntries);