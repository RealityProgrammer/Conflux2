using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record CreateCommunityServerCommand(Guid CreatorUserId, string Name, Stream? AvatarStream) : IRequest<Result<Guid>>;