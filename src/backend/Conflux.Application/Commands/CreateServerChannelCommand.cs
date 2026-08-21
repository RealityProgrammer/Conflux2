using Conflux.Application.Enums;
using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record CreateServerChannelCommand(
    Guid CreatorUserId, 
    Guid ServerId, 
    string Name,
    CommunityServerChannelType Type,
    Guid? ChannelCategoryId
) : IRequest<Result<Guid>>;