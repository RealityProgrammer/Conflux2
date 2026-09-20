using Conflux.Domain.Entities;

namespace Conflux.WebApi.Services;

public interface ISignalRConnectionTracker {
    /// <summary>
    /// Associate user with SignalR's connection ID.
    /// </summary>
    /// <param name="userId">ID of <see cref="ApplicationUser"/>.</param>
    /// <param name="connectionId">Connection ID of SignalR client.</param>
    /// <returns>
    /// <see langword="true"/> if <paramref name="connectionId"/> is first user connection, <see langword="false"/> otherwise.
    /// </returns>
    Task<bool> TrackConnection(Guid userId, string connectionId);
    
    /// <summary>
    /// Unassociate user with SignalR's connection ID.
    /// </summary>
    /// <param name="userId">ID of <see cref="ApplicationUser"/>.</param>
    /// <param name="connectionId">Connection ID of SignalR client.</param>
    /// <returns>
    /// <see langword="true"/> if <paramref name="connectionId"/> is last user connection, <see langword="false"/> otherwise.
    /// </returns>
    Task<bool> UntrackConnection(Guid userId, string connectionId);
}