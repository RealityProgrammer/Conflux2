using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(Attachment), Include = [
    nameof(Attachment.Id),
    nameof(Attachment.Name),
    nameof(Attachment.Type),
])]
public sealed partial record AttachmentDto;