using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Conflux.Application.Features.Servers;

public sealed record CreateServerInvitationCommand(
    Guid CommunityServerId,
    int? MaxUses,
    TimeSpan? ValidDuration
) : ICommand<Result<string>>;

public sealed class CreateServerInvitationHandler(
    IInvitationRepository invitationRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider
) : ICommandHandler<CreateServerInvitationCommand, Result<string>> {
    public async ValueTask<Result<string>> Handle(CreateServerInvitationCommand command, CancellationToken cancellationToken) {
        bool isPermanent = command is { ValidDuration: null, MaxUses: null };

        if (isPermanent) {
            // special treatment so that user can't spam create infinite invitation and clog the database
            var permanentInvite = 
                await invitationRepository.GetPermanentInvite(command.CommunityServerId, cancellationToken);
            
            if (permanentInvite != null) {
                return Result<string>.Success(permanentInvite.Id);
            }
        }
        
        // TODO: Check active cap
        
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
        } catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation } postgresException) {
            if (postgresException.ConstraintName == "FK_Invitations_CommunityServers_CommunityServerId") {
                return Errors.ResourceNotFound("Community server");
            }
            
            return Errors.UnexpectedError();
        } catch (OperationCanceledException) {
            throw;
        } catch {
            return Errors.UnexpectedError();
        }
    }
}