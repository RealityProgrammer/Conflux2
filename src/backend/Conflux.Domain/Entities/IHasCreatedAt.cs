namespace Conflux.Domain.Entities;

public interface IHasCreatedAt {
    DateTimeOffset CreatedAt { get; set; }
}