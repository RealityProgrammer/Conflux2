namespace Conflux.Domain.Repositories;

public interface IRepository<out TEntity> {
    IQueryable<TEntity> AsQueryable();
}