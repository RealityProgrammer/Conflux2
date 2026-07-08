using Conflux.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Conflux.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthenticateController : ControllerBase {
    private readonly IDbContextFactory<ApplicationDbContext> _dbContextFactory;

    public AuthenticateController(IDbContextFactory<ApplicationDbContext> dbContextFactory) {
        _dbContextFactory = dbContextFactory;
    }
    
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