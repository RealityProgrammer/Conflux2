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
        return Errors.ResourceNotFound();

        // Guid? callIdResult = await callingService.GetUserActiveCallId(query.UserId);
        //
        // if (callIdResult == null) {
        //     return Errors.ResourceNotFound();
        // }
        //
        // Guid callId = callIdResult.Value;
        //
        // return await userRepository.GetIdentityProfile(peerIdResult.Value, cancellationToken);
    }
}