using Conflux.Application.Commands;
using Conflux.Application.Services;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Conflux.Domain.Repositories;
using Npgsql;
using System.Data.Common;

namespace Conflux.Application.Handlers;

public sealed class CreateServerChannelCategoryHandler(
    IChannelCategoryRepository channelCategoryRepository,
    IUnitOfWork unitOfWork
) : ICommandHandler<CreateServerChannelCategoryCommand, Result<Guid>> {
    public async ValueTask<Result<Guid>> Handle(CreateServerChannelCategoryCommand request, CancellationToken cancellationToken) {
        ChannelCategory category = new() {
            Name = request.Name,
            CommunityServerId = request.ServerId,
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
}