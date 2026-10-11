using Conflux.Application.Dto;

namespace Conflux.Application.Services;

public interface IConversationMetadataProvider {
    Task<ConversationMetadata?> Get(Guid conversationId, CancellationToken cancellationToken = default);
}