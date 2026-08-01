using Conflux.Domain;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Configuration;
using MimeKit;

namespace Conflux.Application.Interfaces.Implementations;

internal sealed class MailingService(
    IConfiguration config
) : IMailingService {
    public async Task<Result> SendEmailConfirmationAsync(string receiverEmail, string verifyUrl) {
        if (config["Mail:SenderName"] is not { } senderName) {
            return Errors.MissingConfiguration("Mail:SenderName");
        }
        
        if (config["Mail:SenderEmail"] is not { } senderEmail) {
            return Errors.MissingConfiguration("Mail:SenderEmail");
        }
        
        if (config["Mail:Server"] is not { } server) {
            return Errors.MissingConfiguration("Mail:Server");
        }
        
        if (config["Mail:Port"] is not { } port) {
            return Errors.MissingConfiguration("Mail:Port");
        }

        if (!int.TryParse(port, out int parsedPort)) {
            return Result.Failure("Mail.InvalidPort", "Failed to parse mail server port.");
        }
        
        if (config["Mail:Password"] is not { } password) {
            return Errors.MissingConfiguration("Mail:Password");
        }
        
        // TODO: Move the task to background service.
        
        var email = new MimeMessage();
        email.From.Add(new MailboxAddress(senderName, senderEmail));
        email.To.Add(MailboxAddress.Parse(receiverEmail));
        email.Subject = "Account Confirmation code for Conflux";
        email.Body = new TextPart(MimeKit.Text.TextFormat.Html) {
            Text = $"""
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
                                                <a href="{verifyUrl}" target="_blank" style="padding: 12px 24px; border: 1px solid #0d6efd; border-radius: 5px; font-family: Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: bold; display: inline-block;">
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
                    """,
        };

        using var smtp = new SmtpClient();

        try {
            try {
                await smtp.ConnectAsync(server, parsedPort, SecureSocketOptions.StartTls);
            } catch {
                return Errors.ConnectionFailure("mailing server");
            }

            try {
                await smtp.AuthenticateAsync(senderEmail, password);
            } catch {
                return Errors.InvalidCredentials("mailing service");
            }

            try {
                await smtp.SendAsync(email);
            } catch {
                return Errors.OperationFailure("send confirmation email");
            }
            
            return Result.Success();
        } finally {
            await smtp.DisconnectAsync(true);
        }
    }
}