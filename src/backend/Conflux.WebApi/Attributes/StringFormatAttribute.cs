namespace Conflux.WebApi.Attributes;

public enum StringFormat {
    Guid,
}

public class StringFormatAttribute : ValidationAttribute {
    public StringFormat Format { get; init; }
    
    public StringFormatAttribute(StringFormat format) : base("The field {0} is not a valid {1} format.") {
        Format = format;
    }

    public override bool IsValid(object? value) {
        if (value is not string stringValue) {
            return true;
        }
        
        switch (Format) {
            case StringFormat.Guid:
                return Guid.TryParse(stringValue, out _);
            
            default:
                throw new InvalidOperationException("StringFormat attribute has undefined format enumeration.");
        }
    }

    public override string FormatErrorMessage(string name) {
        if (Format is not StringFormat.Guid) {
            throw new InvalidOperationException("StringFormat attribute has undefined format enumeration.");
        }
        
        return string.Format(
            System.Globalization.CultureInfo.CurrentCulture, 
            ErrorMessageString, 
            name, 
            Format
        );
    }
}