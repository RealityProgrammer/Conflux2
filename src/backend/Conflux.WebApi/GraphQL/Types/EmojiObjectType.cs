using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

internal sealed class EmojiObjectType : ObjectType<Emoji> {
    protected override void Configure(IObjectTypeDescriptor<Emoji> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(e => e.Id);
        descriptor.Field(e => e.CreatedAt);
        descriptor.Field(e => e.ShortCode);
        descriptor.Field(e => e.ServerId);
        descriptor.Field(e => e.Server);
    }
}