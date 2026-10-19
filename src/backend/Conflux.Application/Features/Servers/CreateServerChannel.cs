using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Conflux.Application.Features.Servers;

public sealed record CreateServerChannelCommand(
    Guid ServerId,
    string Name,
    ChannelType Type,
    Guid? ChannelCategoryId
) : ICommand<Result<ServerChannelIdentityDto>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.CreateChannel];
}

public sealed record ServerChannelCreatedNotification(
    Guid ServerId, 
    ServerChannelIdentityDto Channel
) : INotification;

public sealed class CreateServerChannelHandler(
    IChannelRepository channelRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator
) : ICommandHandler<CreateServerChannelCommand, Result<ServerChannelIdentityDto>> {
    public async ValueTask<Result<ServerChannelIdentityDto>> Handle(
        CreateServerChannelCommand command, 
        CancellationToken cancellationToken
    ) {
        Channel channel = new() {
            Type = command.Type,
            CommunityServerId = command.ServerId,
            ChannelCategoryId = command.ChannelCategoryId,
            Name = command.Name,
            Conversation = new() {
                Type = ConversationType.Server,
            },
        };

        channelRepository.Add(channel);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation } postgresException) {
            if (postgresException.ConstraintName == "FK_Channels_CommunityServers_CommunityServerId") {
                return Errors.ResourceNotFound("Community Server", [
                    new(nameof(CommunityServer.Id), command.ServerId.ToString()),
                ]);
            }
            
            if (postgresException.ConstraintName == "FK_Channels_ChannelCategories_ChannelCategoryId") {
                return Errors.ResourceNotFound("Channel Category", [
                    new(nameof(ChannelCategory.Id), command.ChannelCategoryId.ToString()!),
                ]);
            }
            
            return Errors.UnexpectedError();
        } catch (OperationCanceledException) {
            throw;
        } catch {
            return Errors.UnexpectedError();
        }

        ServerChannelIdentityDto dto = new(channel);

        await mediator.Publish(new ServerChannelCreatedNotification(command.ServerId, dto), CancellationToken.None);
        return Result<ServerChannelIdentityDto>.Success(dto);
    }
}