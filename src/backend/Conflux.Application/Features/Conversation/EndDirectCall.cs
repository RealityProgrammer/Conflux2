using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record EndDirectCallCommand(Guid CallId) : ICommand<Result<TimelineMessageDto>>;

public sealed record CallEndedNotification(Guid CallId, Guid PeerId, Guid EnderId) : INotification;

internal sealed class EndDirectCallHandler(
    ICurrentUserService currentUserService,
    ICallingService callingService,
    IUserRepository userRepository,
    IDirectConversationProvider directConversationProvider,
    IConversationParticipantsProvider conversationParticipantsProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<EndDirectCallHandler> logger
) : ICommandHandler<EndDirectCallCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(EndDirectCallCommand command, CancellationToken cancellationToken) {
        if (currentUserService.UserId is not { } enderId) {
            return Errors.InvalidIdentifier();
        }
        
        Result<EndDirectCallResult> result = await callingService.EndDirectCall(command.CallId, enderId);
        if (!result.IsSuccess) {
            return result.Error;
        }

        Guid peerId = result.Value!.PeerId;
        await publisher.Publish(new CallEndedNotification(result.Value!.CallId, peerId, enderId), CancellationToken.None);
        
        var conversationResult = await directConversationProvider.GetOrCreate(enderId, peerId, CancellationToken.None);
        
        if (!conversationResult.IsSuccess) {
            return conversationResult.Error;
        }
        
        Domain.Entities.Conversation conversation = conversationResult.Value!;

        // append call ended message to conversation
        Message message = new() {
            Type = MessageType.CallEnd,
            Properties = new CallEndProperties(result.Value!.CallDuration),
            Conversation = conversation,
            SenderUserId = enderId,
        };
        
        conversation.Messages.Add(message);
        
        try {
            await unitOfWork.SaveChangesAsync(CancellationToken.None);
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while saving call ended message.");
            return Errors.UnexpectedError();
        }
        
        try {
            TimelineMessageDto messageDto = new(message) {
                Sender = await userRepository
                    .AsQueryable()
                    .Where(s => s.Id == enderId)
                    .SelectFacet<TimelineMessageSenderDto>()
                    .FirstOrDefaultAsync(CancellationToken.None),
            };
            
            await publisher.Publish(
                new MessageReceivedNotification(conversation.Id, messageDto), 
                CancellationToken.None
            );
            
            if (conversation.Type == ConversationType.Direct) {
                var conversationParticipants = 
                    await conversationParticipantsProvider.GetDirectConversationParticipantIds(conversation.Id, CancellationToken.None);
                
                await publisher.Publish(
                    new DirectConversationUpdatedNotification(conversation.Id, conversationParticipants),
                    CancellationToken.None
                );
            }
            
            return Result<TimelineMessageDto>.Success(messageDto);
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while returning {type}.", nameof(TimelineMessageDto));
            return Errors.UnexpectedError();
        }
    }
}