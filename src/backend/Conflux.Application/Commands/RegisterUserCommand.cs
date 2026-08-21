using Conflux.Domain;
using Conflux.Domain.Entities;

namespace Conflux.Application.Commands;

public sealed record RegisterUserCommand(string Email, string Password) : ICommand<Result<ApplicationUser>>;