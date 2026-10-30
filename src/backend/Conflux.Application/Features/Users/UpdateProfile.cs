using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using Facet;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Conflux.Application.Features.Users;

public sealed record UpdateProfileCommand(
    Guid UserId,
    PatchField<string> DisplayName,
    PatchField<string> Pronouns,
    PatchField<string> Biography,
    PatchField<PresenceStatus> ManualPresenceStatus,
    PatchField<Stream?> Avatar,
    PatchField<Stream?> Banner
) : ICommand<Result<UpdateProfileResult>>;

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
        if (command.DisplayName.IsSet || 
            command.Pronouns.IsSet || 
            command.Biography.IsSet || 
            command.ManualPresenceStatus.IsSet
        ) {
            bool success = await userRepository
                .AsQueryable()
                .Where(u => u.Id == userId)
                .ExecuteUpdateAsync(builder => {
                    if (command.DisplayName.IsSet) 
                        builder.SetProperty(u => u.DisplayName, command.DisplayName.Value);
                        
                    if (command.Pronouns.IsSet) 
                        builder.SetProperty(u => u.Pronouns, string.IsNullOrEmpty(command.Pronouns.Value) ? null : command.Pronouns.Value);
                        
                    if (command.Biography.IsSet) 
                        builder.SetProperty(u => u.Biography, string.IsNullOrEmpty(command.Biography.Value) ? null : command.Biography.Value);
                        
                    if (command.ManualPresenceStatus.IsSet) 
                        builder.SetProperty(u => u.ManualPresenceStatus, command.ManualPresenceStatus.Value);
                }, cancellationToken) == 1;

            if (!success) {
                return Errors.NoUserFoundFromId();
            }
        }

        Optional<int?> avatarVersion = default, bannerVersion = default;

        // process avatar
        if (command.Avatar.IsSet) {
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
        if (command.Banner.IsSet) {
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