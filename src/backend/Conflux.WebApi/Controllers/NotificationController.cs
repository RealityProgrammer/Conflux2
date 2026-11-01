using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Conflux.WebApi.Controllers;

[ApiController, Route("/api/notifications"), Authorize]
public sealed class NotificationController(
    ISender sender
) : ControllerBase {
    
}