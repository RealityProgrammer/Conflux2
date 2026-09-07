using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Helpers;
using Facet.Mapping;

namespace Conflux.Domain.Mappers;

public class MessageMapConfiguration : 
    IFacetMapConfiguration<Message, TimelineMessageReplyDto>,
    IFacetProjectionMapConfiguration<Message, TimelineMessageReplyDto>
{
    public static void Map(Message source, TimelineMessageReplyDto target) {
        (string? snippet, bool hasMore) = StringHelpers.CutSnippet(source.Body);

        target.MessageId = source.Id;
        target.BodySnippet = snippet;
        target.HasMoreBody = hasMore;
        target.SenderUserId = source.SenderUserId;
        target.AttachmentCount = source.Attachments.Length;
    }

    public static void ConfigureProjection(IFacetProjectionBuilder<Message, TimelineMessageReplyDto> builder) {
        builder.Map(target => target.MessageId, source => source.Id);
        builder.Map(target => target.SenderUserId, source => source.SenderUserId);
        builder.Map(target => target.AttachmentCount, source => source.Attachments.Length);
        builder.Map(
            target => target.BodySnippet,
            source => source.ReplyTo == null || source.ReplyTo.Body == null ?
                null :
                source.ReplyTo.Body.Substring(0, Math.Min(source.ReplyTo.Body.Length, 128))
        );
        builder.Map(
            target => target.HasMoreBody,
            source => source.ReplyTo != null && source.ReplyTo.Body != null && source.ReplyTo.Body.Length > 128
        );
    }
}