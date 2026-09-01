using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Conflux.Application.Features.Commands.CreateServerChannelCategory;

public sealed class CreateServerChannelCategoryHandler(
    IChannelCategoryRepository channelCategoryRepository,
    IUnitOfWork unitOfWork
) : ICommandHandler<CreateServerChannelCategoryCommand, Result<Guid>> {
    public async ValueTask<Result<Guid>> Handle(CreateServerChannelCategoryCommand request, CancellationToken cancellationToken) {
        ChannelCategory category = new() {
            Name = request.Name,
            CommunityServerId = request.ServerId,
        };
        
        channelCategoryRepository.Add(category);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(category.Id);
        } catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation } postgresException) {
            if (postgresException.ConstraintName == "FK_ChannelCategories_CommunityServers_CommunityServerId") {
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