using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;

namespace Conflux.WebApi.Controllers;

[ApiController]
[Route("api/csrf")]
public sealed class CsrfController : ControllerBase {
    private readonly IAntiforgery _antiforgery;

    public CsrfController(IAntiforgery antiforgery) {
        _antiforgery = antiforgery;
    }

    [HttpGet("token")]
    public IActionResult GetCsrfToken() {
        var tokens = _antiforgery.GetAndStoreTokens(HttpContext);

        // create a secondary cookie for the frontend.
        Response.Cookies.Append("XSRF-TOKEN", tokens.RequestToken!, new CookieOptions {
            HttpOnly = false,                   // allow javascript reading
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Strict,
        });

        return Ok();
    }
}