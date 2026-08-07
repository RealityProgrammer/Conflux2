using Conflux.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Domain.Extensions;

public static class UserQueryExtensions {
    extension(IQueryable<ApplicationUser> queryable) {
        public IQueryable<ApplicationUser> NameContains(string? value, bool caseSensitive = false) {
            if (string.IsNullOrEmpty(value)) return queryable;
            
            string pattern = $"%{value}%";

            queryable = queryable.Where(u => u.UserName != null && u.DisplayName != null);

            return caseSensitive ?
                queryable.Where(u => 
                    EF.Functions.Like(u.UserName!, pattern) || 
                    EF.Functions.Like(u.DisplayName!, pattern)
                ) :
                queryable.Where(u => 
                    EF.Functions.ILike(u.UserName!, pattern) || 
                    EF.Functions.ILike(u.DisplayName!, pattern)
                );
        }
    }
}