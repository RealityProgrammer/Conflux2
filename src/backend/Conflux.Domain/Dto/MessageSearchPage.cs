using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

public sealed record MessageSearchPage(
    [Required] List<MessageSearchDto> Messages,
	[Required] bool HasNextPage,
    [Required] Guid? NextPageCursor
);
