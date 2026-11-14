namespace Conflux.Domain.Dto;

public sealed record KeyedPaginatedPage<TKey, TElement>(
    TKey BeforeKey,
    TKey AfterKey,
    bool HasPreviousPage,
    bool HasNextPage,
    IReadOnlyList<TElement> Elements
);