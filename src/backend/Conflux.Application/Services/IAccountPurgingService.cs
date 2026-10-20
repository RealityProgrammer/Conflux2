namespace Conflux.Application.Services;

public interface IAccountPurgingService {
    Task PurgePendingDeleteAccounts();
}