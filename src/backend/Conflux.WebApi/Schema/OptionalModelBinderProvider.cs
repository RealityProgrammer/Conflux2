using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Conflux.WebApi.Schema;

internal sealed class OptionalModelBinderProvider : IModelBinderProvider {
    public IModelBinder? GetBinder(ModelBinderProviderContext context) {
        ArgumentNullException.ThrowIfNull(context);

        if (context.Metadata.ModelType.IsGenericType && context.Metadata.ModelType.GetGenericTypeDefinition() == typeof(Facet.Optional<>)) {
            var elementType = context.Metadata.ModelType.GetGenericArguments()[0];

            var elementMetadata = context.MetadataProvider.GetMetadataForType(elementType);
            var innerBinder = context.CreateBinder(elementMetadata);

            var binderType = typeof(OptionalModelBinder<>).MakeGenericType(elementType);
            return (IModelBinder)Activator.CreateInstance(binderType, innerBinder)!;
        }

        return null;
    }
}