using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record SendConfirmationEmailCommand(string ReceiverEmail, string VerifyUrl) : IRequest<Result>;