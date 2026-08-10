using FileSignatures;

namespace Conflux.Application.FileFormats;

public sealed class Wav : FileFormat {
    public Wav() : base([.. "WAVEfmt "u8], "audio/wav", ".wav", 8) { }
}