using Conflux.Application.Dto;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Conflux.WebApi.Miscs;

internal sealed class PatchFieldModelBinderProvider : IModelBinderProvider {
    public IModelBinder? GetBinder(ModelBinderProviderContext context) {
        ArgumentNullException.ThrowIfNull(context);

        if (context.Metadata.ModelType.IsGenericType && context.Metadata.ModelType.GetGenericTypeDefinition() == typeof(PatchField<>)) {
            var elementType = context.Metadata.ModelType.GetGenericArguments()[0];

            var elementMetadata = context.MetadataProvider.GetMetadataForType(elementType);
            var innerBinder = context.CreateBinder(elementMetadata);

            var binderType = typeof(PatchFieldModelBinder<>).MakeGenericType(elementType);
            return (IModelBinder)Activator.CreateInstance(binderType, innerBinder)!;
        }

        return null;
    }
}