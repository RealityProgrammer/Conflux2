export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface EmailConfirmationRequest {
  userId: string;
  confirmationCode: string;
}

export class SetAvatar {
  readonly type = "set";

  constructor(public file: File, public previewUrl: string) {
  }
}

export class DeleteAvatar {
  readonly type = "delete";
}

export class NoAvatarModification {
  readonly type = "noMod";
}

export type AvatarOperation = SetAvatar | DeleteAvatar | NoAvatarModification;

export type MessageLoadDirection = "Before" | "After" | "Around";

export type GetMessagesRequest = {
  channelId: string;
  direction?: MessageLoadDirection;
  cursor?: string;
  count: number;
};