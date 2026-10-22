using Conflux.Application.Services;
using System.Threading.Channels;

namespace Conflux.WebApi.Services.Implementations;

internal sealed class EmailQueue : IEmailQueue {
    private readonly Channel<EmailMessage> _queue;

    public EmailQueue() {
        _queue = Channel.CreateBounded<EmailMessage>(new BoundedChannelOptions(64) {
            FullMode = BoundedChannelFullMode.Wait,
        });
    }
    
    public async ValueTask QueueEmail(EmailMessage message) {
        await _queue.Writer.WriteAsync(message);
    }

    public async ValueTask<EmailMessage> Dequeue(CancellationToken cancellationToken) {
        return await _queue.Reader.ReadAsync(cancellationToken);
    }
}