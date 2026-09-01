using Conflux.Domain;

namespace Conflux.Application.Features.Commands.UploadUserAvatar;

public sealed record UploadUserAvatarCommand(Guid UserId, Stream AvatarStream) : ICommand<Result>;