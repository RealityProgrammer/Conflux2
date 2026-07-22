namespace Conflux.Domain;

public interface IHasCreatedAt {
    DateTimeOffset CreatedAt { get; set; }
}