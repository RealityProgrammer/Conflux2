// using Conflux.Application.Features.Channels;
// using Conflux.Application.Features.Friends;
// using Conflux.Domain;
// using Conflux.Domain.Dto;
// using Conflux.Domain.Enums;
// using Mediator;
// using Microsoft.AspNetCore.Authorization;
// using Microsoft.AspNetCore.Mvc;
// using Microsoft.IdentityModel.JsonWebTokens;
// using Error = Conflux.Domain.Error;
//
// namespace Conflux.WebApi.Controllers;
//
// [ApiController]
// [Route("api/dm/{peerId:guid}")]
// [Authorize]
// public sealed class DirectConversationController(
//     IMediator mediator
// ) : ControllerBase {
//     [HttpGet("summary")]
//     public async Task<ActionResult<ApiResponse<DirectConversationSummary>>> GetSummary(
//         Guid peerId
//     ) {
//         var idClaim = User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
//         
//         if (string.IsNullOrEmpty(idClaim) || !Guid.TryParse(idClaim, out var userId)) {
//             return BadRequest(new ApiResponse<DirectConversationSummary>(null, Errors.InvalidIdentifier()));
//         }
//         
//         var result = await mediator.Send(new GetDirectConversationSummaryQuery(userId, peerId));
//
//         if (result.IsSuccess) {
//             return Ok(new ApiResponse<DirectConversationSummary>(result.Value, Error.None));
//         }
//
//         var errorResponse = new ApiResponse<DirectConversationSummary>(null, result.Error);
//         
//         return result.Error.Code switch {
//             nameof(Errors.ResourceNotFound) => NotFound(errorResponse),
//             _ => StatusCode(StatusCodes.Status500InternalServerError, errorResponse),
//         };
//     }
//
//     public record DirectMessageResolutionResponse(Guid ChannelId);
// }