using Conflux.Domain.Dto;

namespace Conflux.Application.Services;

public interface IServerEmojiProvider {
    Task<Dictionary<Guid, IReadOnlyCollection<EmojiEntryDto>>> GetEntries(
        IReadOnlyCollection<Guid> serverIds, 
        CancellationToken cancellationToken = default
    );
}