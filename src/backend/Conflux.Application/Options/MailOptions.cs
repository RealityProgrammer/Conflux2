namespace Conflux.Application.Options;

public class MailOptions {
    public string ServerHost { get; set; } = "";
    public ushort ServerPort { get; set; }
    public string SenderName { get; set; } = "";
    public string SenderEmail { get; set; } = "";
    public string Password { get; set; } = "";
}