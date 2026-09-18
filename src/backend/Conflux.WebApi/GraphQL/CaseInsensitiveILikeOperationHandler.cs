using HotChocolate.Data.Filters;
using HotChocolate.Data.Filters.Expressions;
using HotChocolate.Language;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using System.Reflection;

namespace Conflux.WebApi.GraphQL;

internal sealed class CaseInsensitiveILikeOperationHandler(InputParser inputParser) : QueryableStringOperationHandler(inputParser) {
    protected override int Operation => GraphQLOperations.ILike;

    public override Expression HandleOperation(
        QueryableFilterContext context,
        IFilterOperationField field,
        IValueNode value,
        object? parsedValue
    ) {
        Expression property = context.GetInstance();

        if (parsedValue is string str) {
            return Expression.Call(
                typeof(NpgsqlDbFunctionsExtensions),
                nameof(NpgsqlDbFunctionsExtensions.ILike),
                Type.EmptyTypes,
                Expression.Property(null, typeof(EF), nameof(EF.Functions)),
                property,
                Expression.Constant($"%{str}%")
            );
        }

        throw new InvalidOperationException();
    }
}