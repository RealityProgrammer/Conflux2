using Conflux.Domain.Entities;

namespace Conflux.Domain.Repositories;

public interface IAttachmentRepository : IReadRepository<Attachment>, IWriteRepository<Attachment>;