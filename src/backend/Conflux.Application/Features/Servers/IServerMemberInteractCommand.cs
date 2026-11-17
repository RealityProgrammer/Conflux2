namespace Conflux.Application.Features.Servers;

public interface IServerMemberInteractCommand : IServerCommand {
    Guid InteractMemberUserId { get; }
}