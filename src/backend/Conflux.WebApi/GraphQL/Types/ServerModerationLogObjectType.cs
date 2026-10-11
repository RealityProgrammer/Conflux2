using Conflux.Domain.Entities;

namespace Conflux.WebApi.GraphQL.Types;

internal sealed class ServerModerationLogObjectType : ObjectType<ServerModerationLog> {
    protected override void Configure(IObjectTypeDescriptor<ServerModerationLog> descriptor) {
        descriptor.BindFieldsExplicitly();

        descriptor.Field(x => x.Id);
        descriptor.Field(x => x.ExecutorMemberId);
        descriptor.Field(x => x.ExecutorMember).Type<CommunityServerMemberObjectType>();
        descriptor.Field(x => x.AffectedMemberId);
        descriptor.Field(x => x.AffectedMember).Type<CommunityServerMemberObjectType>();
        descriptor.Field(x => x.Action);
        descriptor.Field(x => x.Reason);
        descriptor.Field(x => x.BanDuration);
        descriptor.Field(x => x.CreatedAt);
    }
}