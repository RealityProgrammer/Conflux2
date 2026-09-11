using System.Text.Json;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Helpers;

internal static class ErrorExtensionMethods {
    extension(Error error) {
        public IError ToHotChocolateError() {
            var errorBuilder = ErrorBuilder.New().SetCode(error.Code).SetMessage(error.Message);
        
            if (error.Details != null) {
                JsonElement jsonElement = JsonSerializer.SerializeToElement(error.Details);
                errorBuilder.SetExtension("details", jsonElement);
            }
            
            return errorBuilder.Build();
        }
    }
}