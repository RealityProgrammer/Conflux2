using Conflux.Domain.Entities;
using Facet;

namespace Conflux.Domain.Dto;

[Facet(typeof(Message), Include = [
    nameof(Message.Id),
    nameof(Message.SenderUserId),
    nameof(Message.Body),
    nameof(Message.Attachments),
    nameof(Message.CreatedAt),
    nameof(Message.ReplyTo),
], NestedFacets = [
    typeof(TimelineMessageReplyDto),
])]
public sealed partial record TimelineMessageDto;