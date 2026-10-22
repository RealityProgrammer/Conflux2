using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Conflux.WebApi.Controllers;

[ApiController, Route("api")]
public sealed class HealthcheckController : ControllerBase {
    [HttpGet("healthcheck"), AllowAnonymous]
    public OkResult Healthcheck() {
        return Ok();
    }

    [HttpGet("auth-healthcheck"), Authorize]
    public OkResult AuthHealthcheck() {
        return Ok();
    }
}