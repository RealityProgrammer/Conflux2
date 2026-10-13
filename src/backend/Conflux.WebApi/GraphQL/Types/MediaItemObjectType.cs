using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class MediaItemObjectType : ObjectType<MediaItem> {
    protected override void Configure(IObjectTypeDescriptor<MediaItem> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.Version);
        descriptor.Field(x => x.FileName);
        descriptor.Field(x => x.ContentType);
    }
}