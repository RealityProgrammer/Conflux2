using Conflux.Domain;

namespace Conflux.Application.Commands;

public sealed record UploadUserAvatarCommand(Guid UserId, Stream AvatarStream) : IRequest<Result>;