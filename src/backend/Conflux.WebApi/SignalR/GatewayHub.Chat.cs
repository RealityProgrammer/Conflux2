using Conflux.WebApi.Dto;

namespace Conflux.WebApi.SignalR;

partial class GatewayHub {
    // invoked by the frontend only
    public async Task NotifyTyping(string conversationId) {
        if (!Guid.TryParse(conversationId, out var channelIdGuid)) return;
        
        var userId = Context.UserIdentifier;
        if (userId == null) return;

        TypingUserDto? dto = await typingIndicatorService.GetTypingUserAsync(userId);
        if (dto == null) return;
        
        await Clients
            .OthersInGroup(SignalRGroupNameProvider.GetConversationGroupName(channelIdGuid))
            .UserTyping(new(dto.UserId, dto.DisplayName, dto.AvatarVersion), Context.ConnectionAborted);
    }
}