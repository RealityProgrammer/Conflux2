using Conflux.Application.Features.Conversation;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Friends;

public sealed record EndCallCommand(Guid EnderId, Guid PeerId) : ICommand<Result>;

public sealed record CallEndedNotification(Guid PeerId, Guid EnderId) : INotification;

internal sealed class EndCallHandler(
    ICallingService callingService,
    IUserRepository userRepository,
    IDirectConversationProvider directConversationProvider,
    IConversationParticipantsProvider conversationParticipantsProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<EndCallHandler> logger
) : ICommandHandler<EndCallCommand, Result> {
    public async ValueTask<Result> Handle(EndCallCommand command, CancellationToken cancellationToken) {
        Guid enderId = command.EnderId;
        Guid peerId = command.PeerId;
        
        var conversationResult = await directConversationProvider.GetOrCreate(enderId, peerId, CancellationToken.None);

        if (!conversationResult.IsSuccess) {
            return conversationResult.Error;
        }
        
        Result result = await callingService.EndCall(enderId, peerId);

        if (!result.IsSuccess) {
            return result.Error;
        }

        await publisher.Publish(new CallEndedNotification(peerId, enderId), CancellationToken.None);
        
        // append call ended message to conversation
        Domain.Entities.Conversation conversation = conversationResult.Value!;

        Message message = new() {
            Type = MessageType.Call,
            Properties = new CallProperties(CallEventType.End, Duration: null),
            Conversation = conversation,
            SenderUserId = command.EnderId,
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
                    .Where(s => s.Id == command.EnderId)
                    .SelectFacet<TimelineMessageSenderDto>()
                    .FirstOrDefaultAsync(CancellationToken.None),
            };
            
            IReadOnlyCollection<Guid> conversationParticipants = [];

            if (conversation.Type == ConversationType.Direct) {
                conversationParticipants = 
                    await conversationParticipantsProvider.GetDirectConversationParticipantIds(conversation.Id, CancellationToken.None);
            }
            
            await publisher.Publish(
                new MessageReceivedNotification(conversation.Id, conversation.Type, conversationParticipants, messageDto), 
                CancellationToken.None
            );
            
            await publisher.Publish(
                new ConversationUpdatedNotification(conversation.Id, conversationParticipants),
                CancellationToken.None
            );
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while returning {type}.", nameof(TimelineMessageDto));
            return Errors.UnexpectedError();
        }

        return Result.Success();
    }
}