using Conflux.Domain;

namespace Conflux.Application.Features.Commands.ConfirmEmail;

public sealed record ConfirmEmailCommand(string UserId, string ConfirmationCode) : ICommand<Result>;