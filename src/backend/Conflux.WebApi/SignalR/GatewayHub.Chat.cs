using Conflux.WebApi.Dto;

namespace Conflux.WebApi.SignalR;

partial class GatewayHub {
    // invoked by the frontend only
    public async Task NotifyTyping(string channelId) {
        if (!Guid.TryParse(channelId, out var channelIdGuid)) return;
        
        var userId = Context.UserIdentifier;
        if (userId == null) return;

        TypingUserDto? dto = await typingIndicatorService.GetTypingUserAsync(userId);
        if (dto == null) return;
        
        await Clients
            .OthersInGroup(NameProvider.GetChannelGroupName(channelIdGuid))
            .UserTyping(new(dto.UserId, dto.DisplayName, dto.AvatarRevision), Context.ConnectionAborted);
    }
}