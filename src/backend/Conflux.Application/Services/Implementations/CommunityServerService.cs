using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;
using Microsoft.Extensions.Caching.Distributed;

namespace Conflux.Application.Services.Implementations;

public class CommunityServerServiceOptions {
    public long MaxAvatarSizeBytes { get; set; }
}

internal sealed class CommunityServerService(
    ICommunityServerRepository communityServerRepository,
    IUnitOfWork unitOfWork,
    IStorageService storageService,
    IFileFormatInspector fileFormatInspector,
    IDistributedCache distributedCache
) : ICommunityServerService {
    public async Task<Result> Create(
        Guid creatorId, 
        string name, 
        Stream? avatarStream, 
        CancellationToken cancellationToken = default
    ) {
        CommunityServer server = new() {
            Name = name,
            Description = null,
            HasAvatar = false,
            CreatorUserId = creatorId,
            OwnerUserId = creatorId,
            Members = [],
        };

        CommunityServerMember ownerMember = new() {
            UserId = creatorId,
            CommunityServer = server,
        };
        
        server.Members.Add(ownerMember);
        
        communityServerRepository.Add(server);
        
        await unitOfWork.SaveChangesAsync(cancellationToken);
        
        if (avatarStream != null) {
            if (fileFormatInspector.DetermineFileFormat(avatarStream) is not { } fileFormat) {
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(avatarStream)] = [
                        "Unknown file format.",
                    ]
                });
            }

            if (fileFormat is not Image imageFormat) {
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(avatarStream)] = [
                        "Image file format required.",
                    ],
                });
            }

            if (imageFormat.MediaType is not "image/png" and not "image/jpeg") {
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(avatarStream)] = [
                        "Only PNG or JPEG image formats are supported.",
                    ],
                });
            }

            if (avatarStream is { CanSeek: true, Position: > 0 }) {
                avatarStream.Position = 0;
            }

            Result<string> uploadResult = 
                await storageService.UploadCommunityServerAvatarAsync(server.Id, new(avatarStream, imageFormat.MediaType), cancellationToken);

            if (uploadResult.IsSuccess) {
                await communityServerRepository.UpdateHasAvatar(server.Id, true);
            }
        }

        return Result.Success();
    }

    public async Task<Result<CommunityServerSummaryDto>> GetSummary(
        Guid serverId, 
        CancellationToken cancellationToken = default
    ) {
        Result<CommunityServerProfileDto> profileResult = 
            await communityServerRepository.GetProfile(serverId, cancellationToken);

        if (!profileResult.IsSuccess) {
            return profileResult.Error;
        }

        var profile = profileResult.Value!;
        List<ChannelCategorySummaryDto> categories = await GetChannelCategorySummaries(serverId, cancellationToken);

        return Result<CommunityServerSummaryDto>.Success(
            new(profile.Name, profile.Description, profile.HasAvatar, categories)
        );
    }

    private async Task<List<ChannelCategorySummaryDto>> GetChannelCategorySummaries(Guid serverId, CancellationToken cancellationToken = default) {
        List<ChannelCategorySummaryDto> result = 
            await communityServerRepository.GetChannelCategorySummaries(serverId, cancellationToken);

        // TODO: Caching.
        
        return result;
    }

    public string GetAvatarUrl(Guid serverId) {
        return storageService.GetCommunityServerAvatarPreSignedUrl(serverId);
    }
}