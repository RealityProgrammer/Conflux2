const mentionAudio = new Audio("/audio/mention.wav");
mentionAudio.preload = "auto";

export function playMentionAudio() {
  mentionAudio.currentTime = 0;
  mentionAudio.play().catch((err) => {
    console.warn("Mention audio blocked:", err);
  });
}