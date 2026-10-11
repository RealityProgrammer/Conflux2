using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;

namespace Conflux.Infrastructure.Repositories;

internal sealed class AttachmentRepository(
    ApplicationDbContext context
) : IAttachmentRepository {
    public void Add(Attachment value) {
        context.Attachments.Add(value);
    }

    public IQueryable<Attachment> AsQueryable() {
        return context.Attachments;
    }
}