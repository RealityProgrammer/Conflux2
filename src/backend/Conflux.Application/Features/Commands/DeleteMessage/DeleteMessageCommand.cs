using Conflux.Domain;

namespace Conflux.Application.Features.Commands.DeleteMessage;

public sealed record DeleteMessageCommand(Guid RequesterUserId, Guid MessageId) : ICommand<Result>;