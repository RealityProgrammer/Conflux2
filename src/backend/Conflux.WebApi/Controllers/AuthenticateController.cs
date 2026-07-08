using Microsoft.AspNetCore.Mvc;

namespace Conflux.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthenticateController : ControllerBase {
    [HttpGet("health", Name = "Healthcheck")]
    public ActionResult Healthcheck() {
        return Ok();
    }

    [HttpPost("login", Name = "Login")]
    public ActionResult Login() {
        return NotFound();
    }
    
    [HttpPost("register", Name = "Register")]
    public ActionResult Register() {
        return Ok();
    }
}