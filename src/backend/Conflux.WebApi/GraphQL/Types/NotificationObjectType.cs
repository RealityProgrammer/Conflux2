using Conflux.Domain.Entities;
using System.Text.Json;

namespace Conflux.WebApi.GraphQL.Types;

internal sealed class NotificationObjectType : ObjectType<Notification> {
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.General) {
        AllowOutOfOrderMetadataProperties = true,
    };
    
    protected override void Configure(IObjectTypeDescriptor<Notification> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(n => n.Id);
        descriptor.Field(n => n.Type);
        descriptor.Field(n => n.CreatedAt);
        descriptor.Field(n => n.IsRead);
        descriptor.Field(n => n.Payload)
            .ParentRequires<Notification>(n => new { n.Payload })
            .Resolve(context => context.Parent<Notification>().Payload);
    }
}