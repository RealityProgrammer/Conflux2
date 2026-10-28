namespace Conflux.Application.Features;

public interface IConversationCommand : IMessage {
    Guid ConversationId { get; }
}