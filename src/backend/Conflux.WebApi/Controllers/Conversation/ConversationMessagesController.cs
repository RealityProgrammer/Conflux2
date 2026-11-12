using Conflux.Application.Dto;
using Conflux.Application.Features.Conversation;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Enums;
using Conflux.WebApi.Attributes;
using Mediator;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Error = Conflux.Domain.Error;

namespace Conflux.WebApi.Controllers.Conversation;

[ApiController, Route("api/conversations/{conversationId:guid}/messages"), Authorize]
public sealed class ConversationMessagesController(
    ISender sender
) : ControllerBase {
    [HttpPost, Idempotent(30), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> SendMessage(
        Guid conversationId,
        [FromForm] SendMessageRequest request,
        CancellationToken cancellationToken
    ) {
        if (request.Body.AsSpan().Trim().IsEmpty && request.Attachments is not { Length: > 0 }) {
            return BadRequest(new ApiResponse(Errors.EmptyMessageContent()));
        }
        
        UploadFile[] attachments;
        
        if (request.Attachments is { Length: > 0 }) {
            attachments = new UploadFile[request.Attachments.Length];
            
            for (int i = 0; i < attachments.Length; i++) {
                try {
                    attachments[i] = new(request.Attachments[i].FileName, request.Attachments[i].OpenReadStream());
                } catch {
                    foreach (var attachment in attachments) {
                        if (attachment.Stream != null!) {
                            await attachment.Stream.DisposeAsync();
                        }
                    }
        
                    return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(Errors.OperationFailure("open attachment stream")));
                }
            }
        } else {
            attachments = [];
        }

        try {
            var result = await sender.Send(new SendMessageCommand(
                conversationId, 
                request.Body, 
                attachments, 
                request.ReplyToId
            ), cancellationToken);

            if (result.IsSuccess) {
                return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
            }
        
            return result.Error.Code switch {
                nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
                nameof(Errors.RequireActiveAccount) or nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
                nameof(Errors.ValidationErrorsOccurred) => BadRequest(new ApiResponse(result.Error)),
                nameof(Errors.AttachmentUploadFailure) => StatusCode(StatusCodes.Status502BadGateway, new ApiResponse(result.Error)),
                _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(Errors.UnexpectedError())),
            };
        } finally {
            foreach (var stream in attachments) {
                await stream.Stream.DisposeAsync();
            }
        }
    }

    [HttpPatch("{messageId:guid}"), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse<EditedMessageDto>>> EditMessage(
        Guid conversationId,
        Guid messageId,
        [FromForm] EditMessageRequest request,
        CancellationToken cancellationToken
    ) {
        UploadFile[] addAttachmentFiles;
        
        if (request.AddAttachments is { Count: > 0 }) {
            addAttachmentFiles = new UploadFile[request.AddAttachments.Count];
            
            for (int i = 0; i < addAttachmentFiles.Length; i++) {
                try {
                    addAttachmentFiles[i] = new(request.AddAttachments[i].FileName, request.AddAttachments[i].OpenReadStream());
                } catch {
                    foreach (var attachment in addAttachmentFiles) {
                        if (attachment.Stream != null!) {
                            await attachment.Stream.DisposeAsync();
                        }
                    }
        
                    return StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(Errors.OperationFailure("open attachment stream")));
                }
            }
        } else {
            addAttachmentFiles = [];
        }
        
        var result = await sender.Send(new EditMessageCommand(
            conversationId, 
            messageId, 
            request.Body,
            request.RemoveAttachmentIds ?? [],
            addAttachmentFiles
        ), cancellationToken);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<EditedMessageDto>(result.Value!, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.ValidationErrorsOccurred) => BadRequest(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpDelete("{messageId:guid}"), ValidateAntiForgeryToken]
    public async Task<ActionResult> DeleteMessage(Guid conversationId, Guid messageId) {
        Result result = await sender.Send(new DeleteMessageCommand(conversationId, messageId));

        if (result.IsSuccess) {
            return NoContent();
        }
        
        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("read")]
    public async Task<ActionResult<ApiResponse<TimelineMessagePage>>> GetMessages(
        Guid conversationId,
        [FromBody] ReadMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var result = await sender.Send(
            new ReadTimelineMessagesQuery(conversationId, request.ReadStrategy, 50), 
            cancellationToken
        );

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessagePage>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("search")]
    public async Task<ActionResult<ApiResponse<MessageSearchPage>>> SearchMessage(
        Guid conversationId,
        [FromBody] SearchMessageRequest request,
        CancellationToken cancellationToken
    ) {
        var result = await sender.Send(new SearchMessage(conversationId, request.Content, request.SenderIds, request.StartDateTime, request.EndDateTime, request.PinFilter, request.BeforeCursor), cancellationToken);

        if (result.IsSuccess) {
            return Ok(new ApiResponse<MessageSearchPage>(result.Value, Error.None));
        }

        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    [HttpPost("{messageId:guid}/pin"), Idempotent(5), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> PinMessage(
        Guid conversationId,
        Guid messageId
    ) {
        var result = await sender.Send(new PinMessageCommand(conversationId, messageId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }
    
    [HttpPost("{messageId:guid}/unpin"), Idempotent(5), ValidateAntiForgeryToken]
    public async Task<ActionResult<ApiResponse<TimelineMessageDto>>> UnpinMessage(
        Guid conversationId,
        Guid messageId
    ) {
        var result = await sender.Send(new UnpinMessageCommand(conversationId, messageId));

        if (result.IsSuccess) {
            return Ok(new ApiResponse<TimelineMessageDto>(result.Value, Error.None));
        }
        
        return result.Error.Code switch {
            nameof(Errors.RequireActiveAccount) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.InvalidIdentifier) => Unauthorized(new ApiResponse(result.Error)),
            nameof(Errors.Forbidden) => StatusCode(StatusCodes.Status403Forbidden, new ApiResponse(result.Error)),
            nameof(Errors.ResourceNotFound) => NotFound(new ApiResponse(result.Error)),
            _ => StatusCode(StatusCodes.Status500InternalServerError, new ApiResponse(result.Error)),
        };
    }

    public sealed record SendMessageRequest(
        string? Body,
        IFormFile[]? Attachments,
        Guid? ReplyToId
    );

    public sealed record ReadMessageRequest(
        MessageReadStrategy ReadStrategy
    );

    public sealed record EditMessageRequest(
        Facet.Optional<string?> Body,
        List<Guid>? RemoveAttachmentIds,
        IFormFileCollection? AddAttachments
    );

    public sealed record SearchMessageRequest(
        string? Content,
		List<Guid>? SenderIds,
		DateTimeOffset? StartDateTime,
		DateTimeOffset? EndDateTime,
		MessagePinFilter PinFilter,
		Guid? BeforeCursor
    );
}
