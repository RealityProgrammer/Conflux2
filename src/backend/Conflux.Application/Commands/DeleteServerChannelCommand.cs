using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record DeleteServerChannelCommand(
    Guid DeleterUserId, 
    Guid ServerId,
    Guid ChannelId
) : IRequest<Result>;