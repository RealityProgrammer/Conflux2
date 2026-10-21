using Conflux.Application.Options;
using Conflux.Domain;
using Conflux.Domain.Entities;
using Humanizer;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.Collections.Specialized;
using System.Web;

namespace Conflux.Application.Services.Implementations;

public sealed class AuthMailService(
    IEmailQueue emailQueue,
    UserManager<ApplicationUser> userManager,
    IOptions<FrontendOptions> frontendOptions,
    TimeProvider timeProvider
) : IAuthMailService {
    private readonly FrontendOptions _frontendOptions = frontendOptions.Value;
    
    public async Task<Result> SendConfirmationEmail(ApplicationUser user, CancellationToken cancellationToken = default) {
        string confirmCode = await userManager.GenerateEmailConfirmationTokenAsync(user);
        string encodedCode = Base64UrlEncoder.Encode(Encoding.UTF8.GetBytes(confirmCode));

        NameValueCollection queryArguments = HttpUtility.ParseQueryString(string.Empty);
        queryArguments.Add("email", user.Email);
        queryArguments.Add("code", encodedCode);

        UriBuilder builder = new UriBuilder(_frontendOptions.Origin) {
            Path = "auth/confirm-email",
            Query = queryArguments.ToString(),
        };

        string redirectUrl = builder.Uri.ToString();

        string body =
            $"""
             <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #333;">Confirm Your Account</h2>
                
                <p style="color: #555; line-height: 1.6;">
                    Welcome to Conflux! To get started and join the conversation, please confirm your email address by clicking the button below.
                </p>

                <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            <table cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="border-radius: 5px;" bgcolor="#0d6efd">
                                        <a href="{redirectUrl}" target="_blank" style="padding: 12px 24px; border: 1px solid #0d6efd; border-radius: 5px; font-family: Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: bold; display: inline-block;">
                                            Confirm Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <p style="color: #777; font-size: 12px; margin-top: 30px; text-align: center;">
                    If you didn't create a Conflux account, you can safely ignore this email.
                </p>
             </div>
             """;

        await emailQueue.QueueEmail(new(user.Email!, "Account Confirmation code for Conflux", body));
        return Result.Success();
    }

    public async Task<Result> SendPasswordResetEmail(ApplicationUser user, CancellationToken cancellationToken = default) {
        string resetToken = await userManager.GeneratePasswordResetTokenAsync(user);
        string encoded = Base64UrlEncoder.Encode(Encoding.UTF8.GetBytes(resetToken));

        NameValueCollection queryArguments = HttpUtility.ParseQueryString(string.Empty);
        queryArguments.Add("email", user.Email);
        queryArguments.Add("token", encoded);
        
        UriBuilder builder = new UriBuilder(_frontendOptions.Origin) {
            Path = "auth/reset-password",
            Query = queryArguments.ToString(),
        };
        
        string redirectUrl = builder.Uri.ToString();
        DateTimeOffset utcNow = timeProvider.GetUtcNow();
        
        string body =
            $"""
             <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #333;">Reset Account Password</h2>
                
                <p style="color: #555; line-height: 1.6;">
                    At {utcNow:F} GMT, you have requested a password reset email. Please click the button below to access the password reset page.
                </p>

                <table width="100%" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="center" style="padding: 20px 0;">
                            <table cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="border-radius: 5px;" bgcolor="#0d6efd">
                                        <a href="{redirectUrl}" target="_blank" style="padding: 12px 24px; border: 1px solid #0d6efd; border-radius: 5px; font-family: Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: bold; display: inline-block;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>

                <p style="color: #777; font-size: 12px; margin-top: 30px; text-align: center;">
                    If you didn't request a password reset, you can ignore this email, but take caution that your account is being attacked.
                </p>
             </div>
             """;

        await emailQueue.QueueEmail(new(user.Email!, "Reset Password code for Conflux", body));
        return Result.Success();
    }
}