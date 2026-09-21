using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class ChannelType : ObjectType<Channel> {
    protected override void Configure(IObjectTypeDescriptor<Channel> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(c => c.Id);
        descriptor.Field(c => c.Name);
        descriptor.Field(c => c.CreatedAt);
        descriptor.Field(c => c.Conversation);
        descriptor.Field(c => c.ConversationId);
        descriptor.Field(c => c.FriendRequest);
        descriptor.Field(c => c.FriendRequestId);
    }
}