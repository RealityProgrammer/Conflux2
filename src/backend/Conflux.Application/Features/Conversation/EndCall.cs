using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet.Extensions;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Features.Conversation;

public sealed record EndCallCommand(Guid CallId, Guid EnderId) : ICommand<Result<TimelineMessageDto>>;

public sealed record CallEndedNotification(Guid PeerId, Guid EnderId) : INotification;

internal sealed class EndCallHandler(
    ICallingService callingService,
    IUserRepository userRepository,
    IDirectConversationProvider directConversationProvider,
    IConversationParticipantsProvider conversationParticipantsProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher,
    ILogger<EndCallHandler> logger
) : ICommandHandler<EndCallCommand, Result<TimelineMessageDto>> {
    public async ValueTask<Result<TimelineMessageDto>> Handle(EndCallCommand command, CancellationToken cancellationToken) {
        return Errors.UnexpectedError();

        // Guid enderId = command.EnderId;
        // Guid peerId = command.PeerId;
        //
        // var conversationResult = await directConversationProvider.GetOrCreate(enderId, peerId, CancellationToken.None);
        //
        // if (!conversationResult.IsSuccess) {
        //     return conversationResult.Error;
        // }
        //
        // Domain.Entities.Conversation conversation = conversationResult.Value!;
        //
        // Result result = await callingService.LeaveOrEndCall(command.CallId, enderId);
        //
        // if (!result.IsSuccess) {
        //     return result.Error;
        // }
        //
        // await publisher.Publish(new CallEndedNotification(peerId, enderId), CancellationToken.None);
        //
        // // append call ended message to conversation
        // Message message = new() {
        //     Type = MessageType.Call,
        //     Properties = new CallProperties(CallEventType.End, Duration: null),
        //     Conversation = conversation,
        //     SenderUserId = command.EnderId,
        // };
        //
        // conversation.Messages.Add(message);
        //
        // try {
        //     await unitOfWork.SaveChangesAsync(CancellationToken.None);
        // } catch (Exception e) {
        //     logger.LogError(e, "Exception thrown while saving call ended message.");
        //     return Errors.UnexpectedError();
        // }
        //
        // try {
        //     TimelineMessageDto messageDto = new(message) {
        //         Sender = await userRepository
        //             .AsQueryable()
        //             .Where(s => s.Id == command.EnderId)
        //             .SelectFacet<TimelineMessageSenderDto>()
        //             .FirstOrDefaultAsync(CancellationToken.None),
        //     };
        //     
        //     await publisher.Publish(
        //         new MessageReceivedNotification(conversation.Id, messageDto), 
        //         CancellationToken.None
        //     );
        //     
        //     if (conversation.Type == ConversationType.Direct) {
        //         var conversationParticipants = 
        //             await conversationParticipantsProvider.GetDirectConversationParticipantIds(conversation.Id, CancellationToken.None);
        //         
        //         await publisher.Publish(
        //             new DirectConversationUpdatedNotification(conversation.Id, conversationParticipants),
        //             CancellationToken.None
        //         );
        //     }
        //     
        //     return Result<TimelineMessageDto>.Success(messageDto);
        // } catch (Exception e) {
        //     logger.LogError(e, "Exception thrown while returning {type}.", nameof(TimelineMessageDto));
        //     return Errors.UnexpectedError();
        // }
    }
}