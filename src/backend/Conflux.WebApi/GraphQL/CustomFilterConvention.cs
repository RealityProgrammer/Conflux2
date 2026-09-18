using HotChocolate.Data.Filters;
using HotChocolate.Data.Filters.Expressions;

namespace Conflux.WebApi.GraphQL;

internal sealed class CustomFilterConvention : FilterConvention {
    protected override void Configure(IFilterConventionDescriptor descriptor) {
        descriptor.AddDefaults();
        
        descriptor
            .Operation(GraphQLOperations.ILike)
            .Name("ilike");
        
        descriptor.Configure<StringOperationFilterInputType>(x => {
            x.Operation(GraphQLOperations.ILike).Type<StringType>();
        });
        
        descriptor.Provider(
            new QueryableFilterProvider(x => x
                .AddFieldHandler(ctx => new CaseInsensitiveILikeOperationHandler(ctx.InputParser))
                .AddDefaultFieldHandlers()));

        descriptor.MaxAllowedFilterOperations(16);
    }
}