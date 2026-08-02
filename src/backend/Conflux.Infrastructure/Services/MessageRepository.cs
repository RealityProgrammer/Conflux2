using Conflux.Domain;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Services;

internal sealed class MessageRepository(
    ApplicationDbContext dbContext
) : IMessageRepository {
    public void Add(Message message) {
        dbContext.Messages.Add(message);
    }
}