using Conflux.Application.Options;
using Conflux.Application.Services;
using Conflux.Domain;
using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace Conflux.Infrastructure.Services;

internal sealed class MailService(
    IOptions<MailOptions> mailOptions,
    ILogger<MailService> logger
) : IMailService {
    private readonly MailOptions _mailOptions = mailOptions.Value;
    
    public async Task<Result> SendHtmlEmailAsync(
        string toEmail, 
        string subject, 
        string htmlBody, 
        CancellationToken cancellationToken = default
    ) {
        var email = new MimeMessage();
        email.From.Add(new MailboxAddress(_mailOptions.SenderName, _mailOptions.SenderEmail));
        email.To.Add(MailboxAddress.Parse(toEmail));
        email.Subject = subject;
        email.Body = new TextPart(MimeKit.Text.TextFormat.Html) {
            Text = htmlBody,
        };
        
        using var smtp = new SmtpClient();

        try {
            await smtp.ConnectAsync(_mailOptions.ServerHost, _mailOptions.ServerPort, SecureSocketOptions.StartTls, cancellationToken);
            await smtp.AuthenticateAsync(_mailOptions.SenderEmail, _mailOptions.Password, cancellationToken);
            await smtp.SendAsync(email, cancellationToken);
            return Result.Success();
        } catch (AuthenticationException e) {
            logger.LogError(e, "SMTP authentication failed.");
            return Errors.InvalidCredentials("mailing service");
        } catch (SmtpCommandException ex) {
            logger.LogError(ex, "SMTP command failed while sending email to {ToEmail}.", toEmail);
            return Errors.OperationFailure("send confirmation email");
        } catch (Exception ex) {
            logger.LogError(ex, "Failed to connect or send email via SMTP server.");
            return Errors.ConnectionFailure("mailing server");
        } finally {
            if (smtp.IsConnected) {
                await smtp.DisconnectAsync(true, cancellationToken);
            }
        }
    }
}