using Conflux.Application.Enums;
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
    Guid ExecutorUserId,
    Guid ServerId,
    string Name,
    CommunityServerChannelType Type,
    Guid? ChannelCategoryId
) : ICommand<Result<ServerChannelIdentityDto>>, IServerCommand {
    public IEnumerable<ServerPermission> RequiredPermissions => [ServerPermission.CreateChannel];
}

public sealed record ServerChannelCreatedNotification(
    Guid ServerId, 
    ServerChannelIdentityDto Channel
) : INotification;

public sealed class CreateServerChannelHandler(
    ICommunityServerRepository communityServerRepository,
    IChannelRepository channelRepository,
    IUnitOfWork unitOfWork,
    IMediator mediator
) : ICommandHandler<CreateServerChannelCommand, Result<ServerChannelIdentityDto>> {
    public async ValueTask<Result<ServerChannelIdentityDto>> Handle(
        CreateServerChannelCommand request, 
        CancellationToken cancellationToken
    ) {
        if (request.ChannelCategoryId.HasValue) {
            bool hasCategory = await communityServerRepository.IsCategoryExistsInServer(
                request.ServerId, 
                request.ChannelCategoryId.Value, 
                cancellationToken
            );

            if (!hasCategory) {
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(CreateServerChannelCommand.ChannelCategoryId)] = [
                        "The specified category does not exist in this server.",
                    ],
                });
            }
        }

        switch (request.Type) {
            case CommunityServerChannelType.Text:
                return await CreateServerChannel(
                    request.ServerId, 
                    request.Name, 
                    ChannelType.CommunityServerText, 
                    request.ChannelCategoryId,
                    cancellationToken
                );
            
            case CommunityServerChannelType.Voice:
                return await CreateServerChannel(
                    request.ServerId, 
                    request.Name, 
                    ChannelType.CommunityServerVoice, 
                    request.ChannelCategoryId,
                    cancellationToken
                );
            
            default:
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(CreateServerChannelCommand.Type)] = [
                        "Enum value is invalid.",
                    ],
                });
        }
    }
    
    private async Task<Result<ServerChannelIdentityDto>> CreateServerChannel(
        Guid serverId, 
        string name, 
        ChannelType type, 
        Guid? categoryId, 
        CancellationToken cancellationToken = default
    ) {
        Channel channel = new() {
            Type = type,
            CommunityServerId = serverId,
            ChannelCategoryId = categoryId,
            Name = name,
            Conversation = new(),
        };

        channelRepository.Add(channel);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);
        } catch (DbUpdateException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation } postgresException) {
            if (postgresException.ConstraintName == "FK_Channels_CommunityServers_CommunityServerId") {
                return Errors.ResourceNotFound("Community server");
            }
            
            if (postgresException.ConstraintName == "FK_Channels_ChannelCategories_ChannelCategoryId") {
                return Errors.ResourceNotFound("Channel category");
            }
            
            return Errors.UnexpectedError();
        } catch (OperationCanceledException) {
            throw;
        } catch {
            return Errors.UnexpectedError();
        }

        ServerChannelIdentityDto dto = new(channel);

        await mediator.Publish(new ServerChannelCreatedNotification(serverId, dto), CancellationToken.None);
        return Result<ServerChannelIdentityDto>.Success(dto);
    }
}