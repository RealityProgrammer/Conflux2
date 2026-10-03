using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Friends;

public sealed record IncomingCallQuery(Guid UserId) : IQuery<Result<UserIdentityProfileDto>>;

internal sealed class IncomingCallQueryHandler(
    ICallingService callingService,
    IUserRepository userRepository
) : IQueryHandler<IncomingCallQuery, Result<UserIdentityProfileDto>> {
    public async ValueTask<Result<UserIdentityProfileDto>> Handle(IncomingCallQuery query, CancellationToken cancellationToken) {
        var peerIdResult = await callingService.GetCurrentRingingCall(query.UserId);
        
        if (!peerIdResult.IsSuccess) {
            return peerIdResult.Error;
        }
        
        return await userRepository.GetIdentityProfile(peerIdResult.Value, cancellationToken);
    }
}