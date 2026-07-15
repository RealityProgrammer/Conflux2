namespace Conflux.Application;

public readonly record struct Error(string Code, string Message) {
    public override string ToString() {
        return $"<\"{Code}\", \"{Message}\">";
    }
}