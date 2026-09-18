using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class ChannelCategoryType : ObjectType<ChannelCategory> {
    protected override void Configure(IObjectTypeDescriptor<ChannelCategory> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(c => c.Id);
        descriptor.Field(c => c.Name);
        descriptor.Field(c => c.CommunityServer);
        descriptor.Field(c => c.CommunityServerId);
        descriptor.Field(c => c.CreatedAt);
        descriptor.Field(s => s.Channels)
            .Type<ListType<ChannelType>>();
    }
}