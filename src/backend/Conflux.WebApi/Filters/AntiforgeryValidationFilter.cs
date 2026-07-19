using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Conflux.WebApi.Filters;

internal sealed class AntiforgeryValidationFilter : IAsyncAuthorizationFilter {
    private readonly IAntiforgery _antiforgery;

    public AntiforgeryValidationFilter(IAntiforgery antiforgery) {
        _antiforgery = antiforgery;
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context) {
        var request = context.HttpContext.Request;

        // allow safe HTTP methods
        if (HttpMethods.IsGet(request.Method) ||
            HttpMethods.IsHead(request.Method) ||
            HttpMethods.IsOptions(request.Method) ||
            HttpMethods.IsTrace(request.Method)
        ) {
            return;
        }

        var referer = request.Headers.Referer.ToString();

        // check contains instead of starts with because referer is full uri, which creating one can cause some
        // additional overhead.
        if (!string.IsNullOrEmpty(referer) && referer.Contains("/swagger", StringComparison.OrdinalIgnoreCase)) {
            return;
        }

        try {
            await _antiforgery.ValidateRequestAsync(context.HttpContext);
        } catch (AntiforgeryValidationException) {
            // This satisfies your requirement for a detailed error payload
            context.Result = new BadRequestObjectResult(new ApiResponse("Anti-forgery token validation failed."));
        }
    }
}