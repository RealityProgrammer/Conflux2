using Conflux.Application.Commands;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using System.Data.Common;

namespace Conflux.Application.Handlers;

public sealed class CreateInvitationHandler(
    IInvitationRepository invitationRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider
) : ICommandHandler<CreateInvitationCommand, Result<string>> {
    public async ValueTask<Result<string>> Handle(CreateInvitationCommand command, CancellationToken cancellationToken) {
        Invitation invitation = new Invitation {
            Id = Invitation.GenerateKey(),
            CommunityServerId = command.CommunityServerId,
            MaxUses = command.MaxUses,
            ExpiresAt = command.ValidDuration.HasValue ? timeProvider.GetUtcNow() + command.ValidDuration.Value : null,
        };
        
        invitationRepository.Add(invitation);
        
        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
            return Result<string>.Success(invitation.Id);
        } catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation }) {
            return Errors.ResourceNotFound("Community server");
        } catch (OperationCanceledException) {
            throw;
        } catch {
            return Errors.UnexpectedError();
        }
    }
}