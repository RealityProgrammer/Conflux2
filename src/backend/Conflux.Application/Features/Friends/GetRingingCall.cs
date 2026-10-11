using Conflux.Application.Dto;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Dto;
using Conflux.Domain.Repositories;

namespace Conflux.Application.Features.Friends;

public sealed record GetRingingCallQuery(Guid UserId) : IQuery<Result<GetIncomingDirectCallQueryResult?>>;

internal sealed class GetRingingCallHandler(
    ICallingService callingService,
    IUserRepository userRepository
) : IQueryHandler<GetRingingCallQuery, Result<GetIncomingDirectCallQueryResult?>> {
    public async ValueTask<Result<GetIncomingDirectCallQueryResult?>> Handle(GetRingingCallQuery query, CancellationToken cancellationToken) {
        GetIncomingDirectCallResult? result = await callingService.GetIncomingDirectCall(query.UserId);
        
        if (result == null) {
            return Result<GetIncomingDirectCallQueryResult?>.Success(null);
        }

        Result<UserIdentityProfileDto> callerProfile = 
            await userRepository.GetIdentityProfile(result.CallerId, cancellationToken);

        if (!callerProfile.IsSuccess) {
            return callerProfile.Error;
        }

        return Result<GetIncomingDirectCallQueryResult?>.Success(new(result.CallId, callerProfile.Value!));
    }
}