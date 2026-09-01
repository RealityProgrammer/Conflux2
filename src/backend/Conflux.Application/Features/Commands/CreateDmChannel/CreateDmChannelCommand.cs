using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Features.Commands.CreateDmChannel;

public sealed record CreateDmChannelCommand(
    Guid User1,
    Guid User2
) : ICommand<Result<ChannelResolutionResult>>;