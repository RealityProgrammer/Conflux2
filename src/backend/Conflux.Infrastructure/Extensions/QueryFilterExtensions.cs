using Conflux.Domain.Entities;

namespace Conflux.Infrastructure.Extensions;

public static class QueryFilterExtensions {
    public static IQueryable<Message> WithDeleted(this IQueryable<Message> query) {
        return query.IgnoreQueryFilters(["SoftDeletionFilter"]);
    }
}