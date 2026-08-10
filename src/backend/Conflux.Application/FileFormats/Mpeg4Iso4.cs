using FileSignatures.Formats;

namespace Conflux.Application.FileFormats;

public sealed class Mpeg4Iso4() : Isobmff([.."iso4"u8], "video/mp4", "mp4");