using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Application.Dto;

[Facet(typeof(Emoji), Include = [
    nameof(Emoji.Id),
    nameof(Emoji.ShortCode),
    nameof(Emoji.ServerId),
])]
public sealed partial record EmojiDto;