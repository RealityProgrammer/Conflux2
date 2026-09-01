using Conflux.Domain;

namespace Conflux.Application.Features.Commands.SendConfirmationEmail;

public sealed record SendConfirmationEmailCommand(Guid UserId) : ICommand<Result>;