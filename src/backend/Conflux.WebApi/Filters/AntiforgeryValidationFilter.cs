using Conflux.Domain;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Conflux.WebApi.Filters;

internal sealed class AntiforgeryValidationFilter(IAntiforgery antiforgery, IWebHostEnvironment env) : IAsyncAuthorizationFilter {
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context) {
        // bypass antiforgery token for development environment
        if (env.IsDevelopment()) {
            return;
        }
        
        if (context.ActionDescriptor.EndpointMetadata.OfType<IgnoreAntiforgeryTokenAttribute>().Any()) {
            return;
        }
        
        bool explicitlyRequiresValidation = 
            context.ActionDescriptor.EndpointMetadata.OfType<ValidateAntiForgeryTokenAttribute>().Any();
        
        var request = context.HttpContext.Request;

        // allow safe HTTP methods or any endpoint that explicitly require validation
        if (HttpMethods.IsGet(request.Method) ||
            HttpMethods.IsHead(request.Method) ||
            HttpMethods.IsOptions(request.Method) ||
            HttpMethods.IsTrace(request.Method) ||
            !explicitlyRequiresValidation
        ) {
            return;
        }

        var referer = request.Headers.Referer.ToString();
        
        if (!string.IsNullOrEmpty(referer) && referer.Contains("/swagger", StringComparison.OrdinalIgnoreCase)) {
            return;
        }

        try {
            await antiforgery.ValidateRequestAsync(context.HttpContext);
        } catch (AntiforgeryValidationException) {
            context.Result = new BadRequestObjectResult(new ApiResponse(Errors.AntiforgeryTokenVerificationFailed()));
        }
    }
}