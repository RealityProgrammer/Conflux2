using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Entities;
using Conflux.Domain.Enums;
using Conflux.Domain.Repositories;
using FileSignatures;
using FileSignatures.Formats;
using Npgsql;
using System.Data.Common;

namespace Conflux.Application.Services.Implementations;

public class CommunityServerServiceOptions {
    public long MaxAvatarSizeBytes { get; set; }
}

internal sealed class CommunityServerService(
    ICommunityServerRepository communityServerRepository,
    IChannelCategoryRepository channelCategoryRepository,
    IUnitOfWork unitOfWork,
    IChannelService channelService,
    IStorageService storageService,
    IFileFormatInspector fileFormatInspector
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
                await storageService.UploadCommunityServerAvatar(server.Id, new(avatarStream, imageFormat.MediaType), cancellationToken);

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

    private async Task<List<ChannelCategorySummaryDto>> GetChannelCategorySummaries(
        Guid serverId, 
        CancellationToken cancellationToken = default
    ) {
        List<ChannelCategorySummaryDto> result = 
            await communityServerRepository.GetChannelCategorySummaries(serverId, cancellationToken);

        // TODO: Caching.
        
        return result;
    }

    public async Task<Result<Guid>> CreateChannelCategory(
        Guid userId, 
        Guid serverId, 
        string name, 
        CancellationToken cancellationToken = default
    ) {
        ChannelCategory category = new() {
            Name = name,
            CommunityServerId = serverId,
        };
        
        channelCategoryRepository.Add(category);

        try {
            await unitOfWork.SaveChangesAsync(cancellationToken);

            return Result<Guid>.Success(category.Id);
        } catch (DbException e) when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.ForeignKeyViolation }) {
            return Errors.ResourceNotFound("Community server");
        } catch (OperationCanceledException) {
            throw;
        } catch {
            return Errors.UnexpectedError();
        }
    }

    public async Task<Result<Guid>> CreateChannel(
        Guid userId, 
        Guid serverId, 
        string name, 
        ChannelType type, 
        Guid? categoryId, 
        CancellationToken cancellationToken = default
    ) {
        if (categoryId.HasValue) {
            bool hasCategory = await communityServerRepository.IsCategoryExistsInServer(serverId, categoryId.Value, cancellationToken);

            if (!hasCategory) {
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(categoryId)] = [
                        "The specified category does not exist in this server.",
                    ],
                });
            }
        }

        switch (type) {
            case ChannelType.CommunityServerText:
                return await channelService.CreateServerTextChannel(serverId, name, categoryId);
            
            case ChannelType.CommunityServerVoice:
                return await channelService.CreateServerVoiceChannel(serverId, name, categoryId);
            
            default:
                return Errors.ValidationErrorsOccurred(new() {
                    [nameof(type)] = [
                        "Channel type is not a community server channel type.",
                    ],
                });
        }
    }

    public string GetAvatarUrl(Guid serverId) {
        return storageService.GetCommunityServerAvatarPreSignedUrl(serverId);
    }
}