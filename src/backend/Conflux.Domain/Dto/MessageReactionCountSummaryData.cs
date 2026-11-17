using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace Conflux.Domain.Dto;

public sealed class MessageReactionCountSummaryData {
    public Guid MessageId { get; set; }
    public Guid ConversationId { get; set; }
    public string ReactionsCountsJson { get; set; } = "{}";

    [NotMapped]
    public Dictionary<string, int> ReactionsCounts => 
        JsonSerializer.Deserialize<Dictionary<string, int>>(ReactionsCountsJson) ?? [];
}