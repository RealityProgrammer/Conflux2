using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Application.Extensions;

public static class QueryExtensions {
    public static IQueryable<ApplicationUser> IncludeDeletedUsers(this IQueryable<ApplicationUser> query) {
        return query.IgnoreQueryFilters(["IgnoreDeletedUsers"]);
    }
    
    public static IQueryable<Message> IncludeDeletedMessages(this IQueryable<Message> query) {
        return query.IgnoreQueryFilters(["IgnoreDeletedMessages"]);
    }
}