const mentionAudio = new Audio("/audio/aeugh.mp3");

export function playMentionSound() {
  mentionAudio.currentTime = 0;
  mentionAudio.play().catch((err) => {
    console.warn("Audio autoplay blocked by browser policy:", err);
  });
}