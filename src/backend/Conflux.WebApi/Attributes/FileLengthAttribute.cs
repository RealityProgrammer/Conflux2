using System.ComponentModel.DataAnnotations;

namespace Conflux.WebApi.Attributes;

[AttributeUsage(AttributeTargets.Property | AttributeTargets.Field | AttributeTargets.Parameter)]
public class FileLengthAttribute : ValidationAttribute {
    public long MinimumLength { get; set; }
    public long MaximumLength { get; }
    
    public FileLengthAttribute(long maximumLength) : base(() => "") {
        MaximumLength = maximumLength;
    }

    public override bool IsValid(object? value) {
        if (value is not IFormFile file) {
            return true;
        }

        var length = file.Length;
        return length >= MinimumLength && length <= MaximumLength;
    }

    public override string FormatErrorMessage(string name) {
        EnsureLegalLengths();
        
        string errorMessageTemplate = ErrorMessageString;
        
        if (string.IsNullOrEmpty(errorMessageTemplate)) {
            errorMessageTemplate = MinimumLength > 0 
                ? "The field {0} must be a file with a size between {2} and {1} bytes." 
                : "The field {0} must be a file with a maximum size of {1} bytes.";
        }
        
        return string.Format(
            System.Globalization.CultureInfo.CurrentCulture, 
            errorMessageTemplate, 
            name, 
            MaximumLength, 
            MinimumLength
        );
    }

    private void EnsureLegalLengths() {
        if (MaximumLength < 0) {
            throw new InvalidOperationException("MaximumLength of FileLength attribute must be greater than or equal to zero.");
        }

        if (MaximumLength < MinimumLength) {
            throw new InvalidOperationException("FileLength attribute has MaxLength less than MinimumLength.");
        }
    }
}