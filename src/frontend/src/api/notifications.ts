export interface FriendRequestReceivedNotification {
    senderUserId: string;
}

export interface FriendRequestCanceledNotification {
    senderUserId: string;
}

export interface FriendRequestAcceptedNotification {
    acceptorUserId: string;
}

export interface FriendRequestRejectedNotification {
    rejecterUserId: string;
}

export interface UnfriendedNotification {
    invokerUserId: string;
}