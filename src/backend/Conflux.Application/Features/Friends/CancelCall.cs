using Conflux.Application.Features.Messages;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Friends;

public sealed record CancelCallCommand(Guid CallerId, Guid CalleeId) : ICommand<Result>;

public sealed record CallCanceledNotification(Guid CallerId, Guid CalleeId) : INotification;

internal sealed class CancelCallHandler(
    ICallingService callingService,
    IUserRepository userRepository,
    IDirectConversationProvider directConversationProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<CancelCallHandler> logger
) : ICommandHandler<CancelCallCommand, Result> {
    public async ValueTask<Result> Handle(CancelCallCommand command, CancellationToken cancellationToken) {
        Guid callerId = command.CallerId;
        Guid calleeId = command.CalleeId;
        
        var conversationResult = await directConversationProvider.GetOrCreate(callerId, calleeId, CancellationToken.None);

        if (!conversationResult.IsSuccess) {
            return conversationResult.Error;
        }
        
        Result result = await callingService.CancelCall(callerId, calleeId);
        
        if (!result.IsSuccess) {
            return result.Error;
        }
        
        await publisher.Publish(new CallCanceledNotification(callerId, calleeId), CancellationToken.None);
        
        // append call canceled message to conversation
        Conversation directConversation = conversationResult.Value!;

        Message message = new() {
            Type = MessageType.Call,
            Properties = new CallProperties(CallEventType.Canceled, Duration: null),
            Conversation = directConversation,
            SenderUserId = command.CallerId,
        };
        
        directConversation.Messages.Add(message);

        try {
            await unitOfWork.SaveChangesAsync(CancellationToken.None);
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while saving call cancelled message.");
            return Errors.UnexpectedError();
        }

        try {
            TimelineMessageDto messageDto = new(message) {
                Sender = await userRepository
                    .AsQueryable()
                    .Where(s => s.Id == command.CallerId)
                    .SelectFacet<TimelineMessageSenderDto>()
                    .FirstOrDefaultAsync(CancellationToken.None),
            };

            await publisher.Publish(new MessageReceivedNotification(directConversation.Id, messageDto), CancellationToken.None);
        } catch (Exception e) {
            logger.LogError(e, "Exception thrown while publishing message received event.");
            return Errors.UnexpectedError();
        }
        
        return Result.Success();
    }
}