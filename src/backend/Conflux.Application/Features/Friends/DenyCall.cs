using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Friends;

public sealed record DenyCallCommand(Guid CallerId, Guid CalleeId) : ICommand<Result>;

public sealed record CallDeniedNotification(Guid CallerId, Guid CalleeId) : INotification;

internal sealed class DenyCallHandler(
    ICallingService callingService,
    IDirectConversationProvider directConversationProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher
) : ICommandHandler<DenyCallCommand, Result> {
    public async ValueTask<Result> Handle(DenyCallCommand command, CancellationToken cancellationToken) {
        Guid callerId = command.CallerId;
        Guid calleeId = command.CalleeId;

        Result result = await callingService.DenyCall(callerId, calleeId);

        if (!result.IsSuccess) {
            return result;
        }
        
        await publisher.Publish(new CallDeniedNotification(callerId, calleeId), CancellationToken.None);
        
        // append call denied message to conversation
        var conversationResult = await directConversationProvider.GetOrCreate(command.CallerId, command.CalleeId, CancellationToken.None);

        if (conversationResult.IsSuccess) {
            Conversation directConversation = conversationResult.Value!;
            
            directConversation.Messages.Add(new() {
                Type = MessageType.Call,
                Properties = new CallProperties(CallEventType.Denied, Duration: null),
                Conversation = directConversation,
                SenderUserId = command.CallerId,
            });

            await unitOfWork.SaveChangesAsync(CancellationToken.None);
        }

        return Result.Success();
    }
}