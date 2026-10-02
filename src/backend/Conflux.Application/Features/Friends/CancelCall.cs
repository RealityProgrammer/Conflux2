using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Friends;

public sealed record CancelCallCommand(Guid CallerId, Guid CalleeId) : ICommand<Result>;

public sealed record CallCanceledNotification(Guid CallerId, Guid CalleeId) : INotification;

internal sealed class CancelCallHandler(
    ICallingService callingService,
    IDirectConversationProvider directConversationProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher
) : ICommandHandler<CancelCallCommand, Result> {
    public async ValueTask<Result> Handle(CancelCallCommand command, CancellationToken cancellationToken) {
        Guid callerId = command.CallerId;
        Guid calleeId = command.CalleeId;
        
        Result result = await callingService.CancelCall(callerId, calleeId);

        if (!result.IsSuccess) {
            return result;
        }
        
        await publisher.Publish(new CallCanceledNotification(callerId, calleeId), CancellationToken.None);

        // append call canceled message to conversation
        var conversationResult = await directConversationProvider.GetOrCreate(command.CallerId, command.CalleeId, CancellationToken.None);

        if (conversationResult.IsSuccess) {
            Conversation directConversation = conversationResult.Value!;

            directConversation.Messages.Add(new() {
                Type = MessageType.Call,
                Properties = new CallProperties(CallEventType.Canceled, Duration: null),
                Conversation = directConversation,
                SenderUserId = command.CallerId,
            });

            await unitOfWork.SaveChangesAsync(CancellationToken.None);
        }

        return Result.Success();
    }
}