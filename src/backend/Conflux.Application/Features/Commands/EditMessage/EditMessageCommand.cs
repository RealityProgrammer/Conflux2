using Conflux.Domain;
using Conflux.Domain.Dto;

namespace Conflux.Application.Features.Commands.EditMessage;

public sealed record EditMessageCommand(Guid SenderUserId, Guid MessageId, string? Body) : ICommand<Result<MessageDto>>;