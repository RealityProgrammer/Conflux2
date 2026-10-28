using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Application.Dto;

[Facet(typeof(Emoji), Include = [
    nameof(Emoji.Id),
    nameof(Emoji.ShortCode),
    nameof(Emoji.ServerId),
    nameof(Emoji.CreatorId),
    nameof(Emoji.CreatedAt),
], PreserveRequiredProperties = false)]
public sealed partial record EmojiDto {
    [Required] public Guid Id { get; set; } = Id;
    [Required] public string ShortCode { get; set; } = ShortCode;
    [Required] public Guid ServerId { get; set; } = ServerId;
    [Required] public Guid CreatorId { get; set; } = CreatorId;
    [Required] public DateTimeOffset CreatedAt { get; set; } = CreatedAt;
}