using Conflux.Domain;
using Conflux.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Commands.Register;

public sealed class RegisterHandler(
    UserManager<ApplicationUser> userManager
) : ICommandHandler<RegisterCommand, Result<ApplicationUser>> {
    public async ValueTask<Result<ApplicationUser>> Handle(RegisterCommand request, CancellationToken cancellationToken) {
        var generatedUserName = $"user-{Guid.NewGuid():N}";
        
        ApplicationUser user = new ApplicationUser {
            Email = request.Email,
            UserName = generatedUserName,
            DisplayName = generatedUserName,
        };
        var result = await userManager.CreateAsync(user, request.Password);
        
        if (!result.Succeeded) {
            Dictionary<string, string[]> validationErrors = [];

            var emailErrors = result.Errors.Where(r => r.Code.Contains("Email")).ToList();

            if (emailErrors.Count > 0) {
                validationErrors.Add("email", [..emailErrors.Select(e => e.Description)]);
            }

            var passwordErrors = result.Errors.Where(r => r.Code.Contains("Password")).ToList();

            if (passwordErrors.Count > 0) {
                validationErrors.Add("password", [..passwordErrors.Select(e => e.Description)]);
            }
            
            return Errors.ValidationErrorsOccurred(validationErrors);
        }
        
        return Result<ApplicationUser>.Success(user);
    }
}