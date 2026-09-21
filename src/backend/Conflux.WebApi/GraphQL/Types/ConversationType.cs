using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class ConversationType : ObjectType<Conversation> {
    protected override void Configure(IObjectTypeDescriptor<Conversation> descriptor) {
        descriptor.BindFieldsExplicitly();
        
        descriptor.Field(c => c.Id);
        descriptor.Field(c => c.LatestMessageAt);
        descriptor.Field(c => c.Channel);
    }
}