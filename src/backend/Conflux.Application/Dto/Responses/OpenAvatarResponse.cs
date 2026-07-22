namespace Conflux.Application.Dto.Responses;

public record OpenAvatarResponse(Stream AvatarStream, string ContentType, IDisposable DisposeObject);