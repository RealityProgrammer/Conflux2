namespace Conflux.Domain.Dto;

public sealed record GetMessagesResult(List<MessageDto> Messages, bool? HasMoreBefore, bool? HasMoreAfter);