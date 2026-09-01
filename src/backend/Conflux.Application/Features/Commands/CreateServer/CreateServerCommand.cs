using Conflux.Domain;

namespace Conflux.Application.Features.Commands.CreateServer;

public sealed record CreateServerCommand(Guid CreatorUserId, string Name, Stream? AvatarStream) : ICommand<Result<Guid>>;