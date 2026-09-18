using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Extensions;

public static class MessageQueryExtensions {
    public static IQueryable<Message> WithDeleted(this IQueryable<Message> query) {
        return query.IgnoreQueryFilters(["SoftDeletionFilter"]);
    }
}