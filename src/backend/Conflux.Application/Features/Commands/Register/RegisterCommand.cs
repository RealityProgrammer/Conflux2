using Conflux.Domain;
using Conflux.Domain.Entities;

namespace Conflux.Application.Features.Commands.Register;

public sealed record RegisterCommand(string Email, string Password) : ICommand<Result<ApplicationUser>>;