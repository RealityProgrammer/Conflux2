namespace Conflux.Application.Options;

public class StorageServiceOptions {
    public string AccessKey { get; set; } = null!;
    public string SecretKey { get; set; } = null!;
    public string Region { get; set; } = null!;
    public string ServiceUrl { get; set; } = null!;
    public string PreSignUrl { get; set; } = null!;
    public string BucketName { get; set; } = null!;
    public bool UseHttps { get; set; }
}