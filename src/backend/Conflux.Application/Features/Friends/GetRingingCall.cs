using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Friends;

public sealed record GetRingingCallQuery(Guid UserId) : IQuery<Result<UserIdentityProfileDto>>;

internal sealed class GetRingingCallHandler(
    ICallingService callingService,
    IUserRepository userRepository
) : IQueryHandler<GetRingingCallQuery, Result<UserIdentityProfileDto>> {
    public async ValueTask<Result<UserIdentityProfileDto>> Handle(GetRingingCallQuery query, CancellationToken cancellationToken) {
        var peerIdResult = await callingService.GetCurrentRingingCall(query.UserId);
        
        if (!peerIdResult.IsSuccess) {
            return peerIdResult.Error;
        }
        
        return await userRepository.GetIdentityProfile(peerIdResult.Value, cancellationToken);
    }
}