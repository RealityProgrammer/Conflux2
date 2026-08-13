import type {MessageDto} from "../../api/responses.ts";

export interface TimelineContext {
  actions: {
    onMessageDeleteRequest: (message: MessageDto) => void;
  };

  states: {
    viewportWidth: number;
  }
}