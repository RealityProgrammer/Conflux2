using Conflux.Application.Dto;
using Conflux.Application.Options;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet;
using Humanizer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Linq.Expressions;

namespace Conflux.Application.Features.Users;

public sealed record UpdateProfileCommand(
    Guid UserId,
    Optional<string> DisplayName,
    Optional<string> Pronouns,
    Optional<string> Biography,
    Optional<PresenceStatus> ManualPresenceStatus,
    Optional<Stream?> Avatar,
    Optional<Stream?> Banner
) : ICommand<Result<UpdateProfileResult>>;

public sealed class UpdateProfileCommandValidator : AbstractValidator<UpdateProfileCommand> {
    public UpdateProfileCommandValidator(IOptions<MediaOptions> mediaOptions) {
        var options = mediaOptions.Value;
        
        RuleFor(c => c.DisplayName)
            .Must(p => !p.HasValue || p.Value is { Length: >= 8 and <= 48 })
            .WithMessage("{PropertyName} must have at least 8 and maximum of 48 characters.");

        RuleFor(c => c.Pronouns)
            .Must(p => !p.HasValue || p.Value is { Length: <= 32 })
            .WithMessage("{PropertyName} cannot exceed 32 characters.");
        
        RuleFor(c => c.Biography)
            .Must(p => !p.HasValue || p.Value is { Length: <= 255 })
            .WithMessage("{PropertyName} cannot exceed 255 characters.");
        
        RuleFor(c => c.Avatar)
            .Must(stream => !stream.HasValue || stream.Value == null || stream.Value.Length <= options.MaxAvatarSize)
            .WithMessage($"{{PropertyName}} must be smaller or equals to {options.MaxAvatarSize.Bytes().Megabytes}MB ({options.MaxAvatarSize} bytes).");
        
        RuleFor(c => c.Banner)
            .Must(stream => !stream.HasValue || stream.Value == null || stream.Value.Length <= options.MaxBannerSize)
            .WithMessage($"{{PropertyName}} must be smaller or equals to {options.MaxBannerSize.Bytes().Megabytes}MB ({options.MaxBannerSize} bytes).");
    }
}

public sealed class UpdateProfileResult {
    public Optional<int?> AvatarVersion { get; set; }
    public Optional<int?> BannerVersion { get; set; }
}

public sealed class UpdateProfileHandler(
    IUserRepository userRepository,
    IUserMediaService userMediaService
) : ICommandHandler<UpdateProfileCommand, Result<UpdateProfileResult>> {
    public async ValueTask<Result<UpdateProfileResult>> Handle(
        UpdateProfileCommand command, 
        CancellationToken cancellationToken
    ) {
        Guid userId = command.UserId;
        
        // update fields that can be updated with single database call.
        if (command.DisplayName.HasValue || 
            command.Pronouns.HasValue || 
            command.Biography.HasValue || 
            command.ManualPresenceStatus.HasValue
        ) {
            bool success = await userRepository
                .AsQueryable()
                .Where(u => u.Id == userId)
                .ExecuteUpdateAsync(builder => {
                    if (command.DisplayName.HasValue) 
                        builder.SetProperty(u => u.DisplayName, command.DisplayName.Value);
                        
                    if (command.Pronouns.HasValue) 
                        builder.SetProperty(u => u.Pronouns, string.IsNullOrEmpty(command.Pronouns.Value) ? null : command.Pronouns.Value);
                        
                    if (command.Biography.HasValue) 
                        builder.SetProperty(u => u.Biography, string.IsNullOrEmpty(command.Biography.Value) ? null : command.Biography.Value);
                        
                    if (command.ManualPresenceStatus.HasValue) 
                        builder.SetProperty(u => u.ManualPresenceStatus, command.ManualPresenceStatus.Value);
                }, cancellationToken) == 1;

            if (!success) {
                return Errors.NoUserFoundFromId();
            }
        }

        Optional<int?> avatarVersion = default, bannerVersion = default;

        // process avatar
        if (command.Avatar.HasValue) {
            if (command.Avatar.Value is { } avatarStream) {
                var uploadResult = await userMediaService.UploadAvatar(userId, avatarStream, cancellationToken);

                if (uploadResult.IsSuccess) {
                    await userRepository
                        .AsQueryable()
                        .Where(u => u.Id == userId)
                        .ExecuteUpdateAsync(builder => {
                            builder.SetProperty(u => u.AvatarVersion, u => u.AvatarVersion == null ? 1 : u.AvatarVersion + 1);
                        }, cancellationToken);

                    avatarVersion = await userRepository
                        .AsQueryable()
                        .Where(u => u.Id == userId)
                        .Select(u => u.AvatarVersion)
                        .FirstOrDefaultAsync(cancellationToken);
                }
            } else {
                await userMediaService.DeleteAvatar(userId, cancellationToken);
                
                await userRepository
                    .AsQueryable()
                    .Where(u => u.Id == userId)
                    .ExecuteUpdateAsync(builder => {
                        builder.SetProperty(u => u.AvatarVersion, (int?)null);
                    }, cancellationToken);

                avatarVersion = new(null);
            }
        }
        
        // process banner
        if (command.Banner.HasValue) {
            if (command.Banner.Value is { } bannerStream) {
                var uploadResult = await userMediaService.UploadBanner(userId, bannerStream, cancellationToken);

                if (uploadResult.IsSuccess) {
                    await userRepository
                        .AsQueryable()
                        .Where(u => u.Id == userId)
                        .ExecuteUpdateAsync(builder => {
                            builder.SetProperty(u => u.BannerVersion, u => u.BannerVersion == null ? 1 : u.BannerVersion + 1);
                        }, cancellationToken);
                    
                    bannerVersion = await userRepository
                        .AsQueryable()
                        .Where(u => u.Id == userId)
                        .Select(u => u.AvatarVersion)
                        .FirstOrDefaultAsync(cancellationToken);
                }
            } else {
                await userMediaService.DeleteBanner(userId, cancellationToken);
                
                await userRepository
                    .AsQueryable()
                    .Where(u => u.Id == userId)
                    .ExecuteUpdateAsync(builder => {
                        builder.SetProperty(u => u.BannerVersion, (int?)null);
                    }, cancellationToken);

                bannerVersion = new(null);
            }
        }

        return Result<UpdateProfileResult>.Success(new() {
            AvatarVersion = avatarVersion,
            BannerVersion = bannerVersion,
        });
    }
}