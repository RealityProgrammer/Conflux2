using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace Conflux.Application.Features.Users;

public sealed record SetUserNamesCommand(
    Guid UserId,
    string UserName,
    string DisplayName
) : ICommand<Result>;

public sealed class SetupUserProfileHandler(
    UserManager<ApplicationUser> userManager,
    IUnitOfWork unitOfWork
) : ICommandHandler<SetUserNamesCommand, Result> {
    public async ValueTask<Result> Handle(SetUserNamesCommand request, CancellationToken cancellationToken) {
        ApplicationUser? user = await userManager.FindByIdAsync(request.UserId.ToString());

        if (user == null) {
            return Errors.NoUserFoundFromId();
        }

        await unitOfWork.BeginTransactionAsync(cancellationToken);

        try {
            IdentityResult result = await userManager.SetUserNameAsync(user, request.UserName);

            if (!result.Succeeded) {
                var firstError = result.Errors.First();
                return Result.Failure(firstError.Code, firstError.Description);
            }

            user.DisplayName = request.DisplayName;
            
            await unitOfWork.SaveChangesAsync(cancellationToken);
            await unitOfWork.CommitAsync(cancellationToken);

            return Result.Success();
        } catch (OperationCanceledException) {
            throw;
        } catch {
            await unitOfWork.RollbackAsync(cancellationToken);
            return Errors.UnexpectedError();
        }
    }
}