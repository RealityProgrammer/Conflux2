namespace Conflux.Domain.Repositories;

public interface IWriteRepository<T> : IRepository<T> {
    void Add(T value);
}