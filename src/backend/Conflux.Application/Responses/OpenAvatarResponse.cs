namespace Conflux.Application.Responses;

public record OpenAvatarResponse(Stream AvatarStream, string ContentType, IDisposable DisposeObject);