using Conflux.Application.Commands;
using Conflux.Application.Enums;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Handlers;

public sealed class CreateServerChannelHandler(
    ICommunityServerRepository communityServerRepository,
    IChannelRepository channelRepository,
    IUnitOfWork unitOfWork
) : IRequestHandler<CreateServerChannelCommand, Result<Guid>> {
    public async ValueTask<Result<Guid>> Handle(CreateServerChannelCommand request, CancellationToken cancellationToken) {
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
                return await CreateServerChannel(request.ServerId, request.Name, ChannelType.CommunityServerText, request.ChannelCategoryId);
            
            case CommunityServerChannelType.Voice:
                return await CreateServerChannel(request.ServerId, request.Name, ChannelType.CommunityServerVoice, request.ChannelCategoryId);
            
            default:
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(CreateServerChannelCommand.Type)] = [
                        "Enum value is invalid.",
                    ],
                });
        }
    }
    
    private async Task<Result<Guid>> CreateServerChannel(Guid serverId, string name, ChannelType type, Guid? categoryId) {
        Channel channel = new() {
            Type = type,
            Conversation = new(),
            CommunityServerId = serverId,
            ChannelCategoryId = categoryId,
            Name = name,
        };
        
        channelRepository.Add(channel);

        await unitOfWork.SaveChangesAsync();
        
        return Result<Guid>.Success(channel.Id);
    }
}