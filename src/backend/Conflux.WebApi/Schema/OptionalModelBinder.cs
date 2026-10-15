using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Conflux.WebApi.Schema;

internal sealed class OptionalModelBinder<T>(IModelBinder innerBinder) : IModelBinder {
    private readonly IModelBinder _innerBinder = 
        innerBinder ?? throw new ArgumentNullException(nameof(innerBinder));

    public async Task BindModelAsync(ModelBindingContext bindingContext) {
        if (bindingContext == null) throw new ArgumentNullException(nameof(bindingContext));

        var modelName = bindingContext.ModelName;

        bool isSet = bindingContext.ValueProvider.ContainsPrefix(modelName);

        if (!isSet && bindingContext.HttpContext.Request.HasFormContentType) {
            var files = bindingContext.HttpContext.Request.Form.Files;
            isSet = files.GetFile(modelName) != null || files.GetFiles(modelName).Count > 0;
        }

        if (!isSet) {
            bindingContext.Result = ModelBindingResult.Success(default(Facet.Optional<T>));
            return;
        }

        ModelBindingResult innerResult;
        using (bindingContext.EnterNestedScope(
            modelMetadata: bindingContext.ModelMetadata.GetMetadataForType(typeof(T)),
            fieldName: bindingContext.FieldName,
            modelName: bindingContext.ModelName,
            model: null)
        ) {
            await _innerBinder.BindModelAsync(bindingContext);
            innerResult = bindingContext.Result;
        }

        bindingContext.Result = ModelBindingResult.Success(innerResult.IsModelSet ? 
            new Facet.Optional<T>((T)innerResult.Model!) : 
            new Facet.Optional<T>(default!));
    }
}