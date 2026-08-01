using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class MessagingRepository(
    ApplicationDbContext dbContext
) : IMessagingRepository {
    public Task<Result> CreateMessageAsync(
        Guid senderUserId, 
        string? body, 
        IList<Guid> attachmentIds, 
        CancellationToken cancellationToken = default
    ) {
        throw new NotImplementedException();
    }
}