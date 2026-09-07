using Conflux.Domain.Entities;
using Conflux.Domain.Mappers;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(Message), Include = [], Configuration = typeof(MessageMapConfiguration), GenerateParameterlessConstructor = false)]
public sealed partial record TimelineMessageReplyDto {
    [Required] public Guid MessageId { get; set; }
    [Required] public Guid SenderUserId { get; set; }
    [Required] public string? BodySnippet { get; set; }
    [Required] public bool HasMoreBody { get; set; }
    [Required] public int AttachmentCount { get; set; }
}