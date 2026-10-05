using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(Message), Include = [
    nameof(Message.Id),
    nameof(Message.Body),
    nameof(Message.Attachments),
    nameof(Message.SenderUserId),
    nameof(Message.Sender),
    nameof(Message.CreatedAt),
    nameof(Message.UpdatedAt),
    nameof(Message.PinnedAt),
], NestedFacets = [
    typeof(TimelineMessageSenderDto),
    typeof(AttachmentDto),
])]
public sealed partial record PinnedMessageDto;