using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

internal sealed class NotificationPayloadObjectType : InterfaceType<INotificationPayload> {
    protected override void Configure(IInterfaceTypeDescriptor<INotificationPayload> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(p => p.TypeName);
    }
}

internal sealed class MentionNotificationPayloadObjectType : ObjectType<MentionNotificationPayload> {
    protected override void Configure(IObjectTypeDescriptor<MentionNotificationPayload> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(p => p.Source);
    }
}