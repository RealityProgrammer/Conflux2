using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Conflux.Application.Features.Servers;

public sealed record CreateServerChannelCategoryCommand(
    Guid ExecutorUserId,
    Guid ServerId,
    string Name
) : ICommand<Result<ChannelCategoryIdentityDto>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.CreateChannel];
}

public sealed record ServerChannelCategoryCreatedNotification(
    Guid ServerId,
    ChannelCategoryIdentityDto CategoryIdentity
) : INotification;

public sealed class CreateServerChannelCategoryHandler(
    IChannelCategoryRepository channelCategoryRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator
) : ICommandHandler<CreateServerChannelCategoryCommand, Result<ChannelCategoryIdentityDto>> {
    public async ValueTask<Result<ChannelCategoryIdentityDto>> Handle(CreateServerChannelCategoryCommand request, CancellationToken cancellationToken) {
        ChannelCategory category = new() {
            Name = request.Name,
            CommunityServerId = request.ServerId,
        };
        
        channelCategoryRepository.Add(category);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
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
        
        ChannelCategoryIdentityDto dto = new(category.Id, category.Name);

        await mediator.Publish(new ServerChannelCategoryCreatedNotification(category.CommunityServerId, dto), CancellationToken.None);
        return Result<ChannelCategoryIdentityDto>.Success(dto);
    }
}