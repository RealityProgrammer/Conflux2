using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class ConversationParticipantObjectType : ObjectType<ConversationParticipant> {
    protected override void Configure(IObjectTypeDescriptor<ConversationParticipant> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(p => p.Conversation);
        descriptor.Field(p => p.ConversationId);
        descriptor.Field(p => p.User);
        descriptor.Field(p => p.UserId);
    }
}