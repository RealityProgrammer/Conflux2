namespace Conflux.Domain.Repositories;

public interface IRepository<TEntity> {
    IQueryable<TEntity> AsQueryable();

    void Add(TEntity value);
}