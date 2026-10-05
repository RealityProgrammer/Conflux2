using Conflux.Domain.Dto;

namespace Conflux.WebApi.GraphQL.Types;

public sealed class PinnedMessageObjectType : ObjectType<PinnedMessageDto> {
    protected override void Configure(IObjectTypeDescriptor<PinnedMessageDto> descriptor) {
        descriptor.BindFieldsImplicitly();
    }
}