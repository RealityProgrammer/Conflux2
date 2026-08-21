using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record CreateServerChannelCategoryCommand(
    Guid CreatorUserId, 
    Guid ServerId, 
    string Name
) : ICommand<Result<Guid>>;