namespace Conflux.Domain.Dto;

[Flags]
public enum UserProfileQueryFlags {
    None = 0,
    
    UserName = 1 << 0,
    DisplayName = 1 << 1,
    Avatar = 1 << 2,
    Biography = 1 << 3,
    Pronouns = 1 << 4,
    CreatedAt = 1 << 5,
    
    Basic = UserName | DisplayName | Avatar,
}