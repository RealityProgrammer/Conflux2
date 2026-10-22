namespace Conflux.Application.Options;

public class S3Options {
    public string Endpoint { get; set; } = "";
    public string AccessKey { get; set; } = "";
    public string SecretKey { get; set; } = "";
    public string Region { get; set; } = "";
    public string BucketName { get; set; } = "";
}