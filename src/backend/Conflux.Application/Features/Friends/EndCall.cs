using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;

namespace Conflux.Application.Features.Friends;

public sealed record EndCallCommand(Guid EnderId, Guid PeerId) : ICommand<Result>;

public sealed record CallEndedNotification(Guid PeerId, Guid EnderId) : INotification;

internal sealed class EndCallHandler(
    ICallingService callingService,
    IDirectConversationProvider directConversationProvider,
    IUnitOfWork unitOfWork,
    IPublisher publisher
) : ICommandHandler<EndCallCommand, Result> {
    public async ValueTask<Result> Handle(EndCallCommand command, CancellationToken cancellationToken) {
        Guid enderId = command.EnderId;
        Guid peerId = command.PeerId;
        
        Result result = await callingService.EndCall(enderId, peerId);

        if (!result.IsSuccess) {
            return result;
        }

        await publisher.Publish(new CallEndedNotification(peerId, enderId), CancellationToken.None);
        
        var conversationResult = await directConversationProvider.GetOrCreate(enderId, peerId, CancellationToken.None);

        if (conversationResult.IsSuccess) {
            Conversation directConversation = conversationResult.Value!;

            directConversation.Messages.Add(new() {
                Type = MessageType.Call,
                Properties = new CallProperties(CallEventType.End, Duration: null),
                Conversation = directConversation,
                SenderUserId = command.EnderId,
            });

            await unitOfWork.SaveChangesAsync(CancellationToken.None);
        }

        return Result.Success();
    }
}