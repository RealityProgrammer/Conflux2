using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record DeleteServerChannelCategoryCommand(
    Guid DeleterUserId, 
    Guid ServerId,
    Guid CategoryId
) : ICommand<Result>;