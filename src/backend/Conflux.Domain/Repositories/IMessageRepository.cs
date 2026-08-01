namespace Conflux.Domain.Repositories;

public interface IMessageRepository {
    void Add(Message message);
}