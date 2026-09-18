using System.ComponentModel.DataAnnotations.Schema;
using System.Security.Cryptography;

namespace Conflux.Domain.Entities;

public class Invitation : IHasCreatedAt {
    // TODO: switch to guid once i figure out how to convert guid to base62
    public string Id { get; set; } = string.Empty;
    
    public Guid CommunityServerId { get; set; }
    public CommunityServer? CommunityServer { get; set; }
    
    public int? MaxUses { get; set; }
    public int CurrentUses { get; set; }
    
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? LastUsedAt { get; set; }
    
    public bool IsValidAt(DateTimeOffset now) =>
        (ExpiresAt == null || now < ExpiresAt.Value) &&
        (MaxUses == null || CurrentUses < MaxUses.Value);

    public static string GenerateKey() {
        ReadOnlySpan<char> characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        
        return RandomNumberGenerator.GetString(characters, 12);
    }
}