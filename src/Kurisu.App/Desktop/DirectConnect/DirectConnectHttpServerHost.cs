using System.Net;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using Kurisu.Core.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Kurisu.App.Desktop.DirectConnect;

/// <summary>
/// Hosts the local HTTP surface for direct-connect session control using
/// <see cref="HttpListener"/> so that the desktop shell does not need an
/// ASP.NET Core / Kestrel dependency.
/// </summary>
public sealed class DirectConnectHttpServerHost(
    IOptions<DirectConnectServerOptions> options,
    IDirectConnectSessionService directConnectSessionService,
    ILogger<DirectConnectHttpServerHost> logger) : IDirectConnectServerHost, IAsyncDisposable, IDisposable
{
    private static readonly TimeSpan StreamHeartbeatInterval = TimeSpan.FromSeconds(15);
    private static readonly JsonSerializerOptions StreamJsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly object gate = new();
    private readonly string accessToken = GenerateAccessToken();
    private HttpListener? listener;
    private DirectConnectServerState state = new()
    {
        Enabled = options.Value.Enabled
    };
    private CancellationTokenSource? listenerCts;
    private Task? listenerLoop;

    /// <inheritdoc />
    public DirectConnectServerState State
    {
        get
        {
            lock (gate)
            {
                return state;
            }
        }
    }

    /// <inheritdoc />
    public Task<DirectConnectServerState> StartAsync(CancellationToken cancellationToken = default)
    {
        lock (gate)
        {
            if (listener is not null || state.Listening)
            {
                return Task.FromResult(state);
            }
        }

        var configured = options.Value;
        if (!configured.Enabled)
        {
            SetState(new DirectConnectServerState
            {
                Enabled = false
            });
            return Task.FromResult(State);
        }

        var configuredPort = configured.Port;
        var resolvedPort = configuredPort;
        if (configuredPort <= 0)
        {
            resolvedPort = FindFreeTcpPort(configured.Host);
        }

        var prefix = BuildListenPrefix(configured.Host, resolvedPort);
        HttpListener httpListener;
        try
        {
            httpListener = new HttpListener();
            httpListener.Prefixes.Add(prefix);
            httpListener.Start();
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Direct-connect HTTP server failed to start");
            SetState(new DirectConnectServerState
            {
                Enabled = true,
                Listening = false,
                AccessToken = accessToken,
                Error = exception.Message
            });
            return Task.FromResult(State);
        }

        var baseUrl = prefix.TrimEnd('/');
        var cts = new CancellationTokenSource();
        var loop = Task.Run(() => AcceptLoopAsync(httpListener, cts.Token), CancellationToken.None);

        lock (gate)
        {
            listener = httpListener;
            listenerCts = cts;
            listenerLoop = loop;
            state = new DirectConnectServerState
            {
                Enabled = true,
                Listening = true,
                BaseUrl = baseUrl,
                AccessToken = accessToken
            };
            return Task.FromResult(state);
        }
    }

    /// <inheritdoc />
    public async Task StopAsync(CancellationToken cancellationToken = default)
    {
        HttpListener? httpListener;
        CancellationTokenSource? cts;
        Task? loop;

        lock (gate)
        {
            httpListener = listener;
            cts = listenerCts;
            loop = listenerLoop;
            listener = null;
            listenerCts = null;
            listenerLoop = null;
            state = state.WithListening(false);
        }

        if (httpListener is not null)
        {
            try
            {
                httpListener.Stop();
                httpListener.Close();
            }
            catch (Exception exception)
            {
                logger.LogDebug(exception, "Error stopping direct-connect HTTP listener");
            }
        }

        cts?.Cancel();
        if (loop is not null)
        {
            try
            {
                await loop.ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
            }
            catch (Exception exception)
            {
                logger.LogDebug(exception, "Direct-connect listener loop terminated with error");
            }
        }
        cts?.Dispose();
    }

    /// <inheritdoc />
    public void Dispose() => StopAsync().GetAwaiter().GetResult();

    /// <inheritdoc />
    public async ValueTask DisposeAsync() => await StopAsync();

    private void SetState(DirectConnectServerState nextState)
    {
        lock (gate)
        {
            state = nextState;
        }
    }

    private async Task AcceptLoopAsync(HttpListener httpListener, CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            HttpListenerContext context;
            try
            {
                context = await httpListener.GetContextAsync().ConfigureAwait(false);
            }
            catch (HttpListenerException)
            {
                return;
            }
            catch (ObjectDisposedException)
            {
                return;
            }
            catch (Exception exception)
            {
                logger.LogDebug(exception, "Direct-connect listener accept loop error");
                return;
            }

            _ = Task.Run(() => HandleRequestAsync(context, cancellationToken), CancellationToken.None);
        }
    }

    private async Task HandleRequestAsync(HttpListenerContext context, CancellationToken cancellationToken)
    {
        try
        {
            var request = context.Request;
            var response = context.Response;

            if (!IsAuthorized(request, accessToken))
            {
                response.StatusCode = (int)HttpStatusCode.Unauthorized;
                await WriteJsonAsync(response, new { error = "Unauthorized direct-connect request." }, cancellationToken).ConfigureAwait(false);
                return;
            }

            var path = request.Url?.AbsolutePath.TrimEnd('/') ?? string.Empty;
            var method = request.HttpMethod;

            switch ((method, path))
            {
                case ("GET", "/direct-connect/server"):
                    await WriteJsonAsync(response, State, cancellationToken).ConfigureAwait(false);
                    return;
                case ("POST", "/direct-connect/sessions"):
                    {
                        var body = await ReadJsonBodyAsync<CreateDirectConnectSessionRequest>(request, cancellationToken).ConfigureAwait(false);
                        if (body is null)
                        {
                            await WriteErrorAsync(response, HttpStatusCode.BadRequest, "Missing or invalid request body.", cancellationToken).ConfigureAwait(false);
                            return;
                        }
                        var result = await directConnectSessionService.CreateSessionAsync(body, cancellationToken).ConfigureAwait(false);
                        await WriteJsonAsync(response, result, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                case ("GET", "/direct-connect/sessions"):
                    {
                        var list = await directConnectSessionService.ListSessionsAsync(cancellationToken).ConfigureAwait(false);
                        await WriteJsonAsync(response, list, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                case ("GET", var p) when p.StartsWith("/direct-connect/sessions/") && p.EndsWith("/events/stream", StringComparison.Ordinal):
                    {
                        var id = ExtractSessionId(p, "/direct-connect/sessions/", "/events/stream");
                        var afterSequence = ParseLong(request.QueryString["afterSequence"]);
                        await StreamSessionEventsAsync(context, id, afterSequence, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                case ("GET", var p) when p.StartsWith("/direct-connect/sessions/") && p.EndsWith("/events", StringComparison.Ordinal):
                    {
                        var id = ExtractSessionId(p, "/direct-connect/sessions/", "/events");
                        var afterSequence = ParseLong(request.QueryString["afterSequence"]);
                        var maxCount = ParseInt(request.QueryString["maxCount"]) ?? 100;
                        var result = await directConnectSessionService.ReadEventsAsync(id, afterSequence, maxCount, cancellationToken).ConfigureAwait(false);
                        await WriteJsonAsync(response, result, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                case ("GET", var p) when p.StartsWith("/direct-connect/sessions/"):
                    {
                        var id = ExtractSessionId(p, "/direct-connect/sessions/", null);
                        var result = await directConnectSessionService.GetSessionAsync(id, cancellationToken).ConfigureAwait(false);
                        await WriteJsonAsync(response, result, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                case ("POST", var p) when p.StartsWith("/direct-connect/sessions/") && p.EndsWith("/turns", StringComparison.Ordinal):
                    {
                        var id = ExtractSessionId(p, "/direct-connect/sessions/", "/turns");
                        var body = await ReadJsonBodyAsync<StartDesktopSessionTurnRequest>(request, cancellationToken).ConfigureAwait(false);
                        if (body is null)
                        {
                            await WriteErrorAsync(response, HttpStatusCode.BadRequest, "Missing or invalid request body.", cancellationToken).ConfigureAwait(false);
                            return;
                        }
                        var result = await directConnectSessionService.StartTurnAsync(id, body, cancellationToken).ConfigureAwait(false);
                        await WriteJsonAsync(response, result, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                case ("POST", var p) when p.StartsWith("/direct-connect/sessions/") && p.EndsWith("/approvals", StringComparison.Ordinal):
                    {
                        var id = ExtractSessionId(p, "/direct-connect/sessions/", "/approvals");
                        var body = await ReadJsonBodyAsync<ApproveDesktopSessionToolRequest>(request, cancellationToken).ConfigureAwait(false);
                        if (body is null)
                        {
                            await WriteErrorAsync(response, HttpStatusCode.BadRequest, "Missing or invalid request body.", cancellationToken).ConfigureAwait(false);
                            return;
                        }
                        var result = await directConnectSessionService.ApprovePendingToolAsync(id, body, cancellationToken).ConfigureAwait(false);
                        await WriteJsonAsync(response, result, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                case ("POST", var p) when p.StartsWith("/direct-connect/sessions/") && p.EndsWith("/answers", StringComparison.Ordinal):
                    {
                        var id = ExtractSessionId(p, "/direct-connect/sessions/", "/answers");
                        var body = await ReadJsonBodyAsync<AnswerDesktopSessionQuestionRequest>(request, cancellationToken).ConfigureAwait(false);
                        if (body is null)
                        {
                            await WriteErrorAsync(response, HttpStatusCode.BadRequest, "Missing or invalid request body.", cancellationToken).ConfigureAwait(false);
                            return;
                        }
                        var result = await directConnectSessionService.AnswerPendingQuestionAsync(id, body, cancellationToken).ConfigureAwait(false);
                        await WriteJsonAsync(response, result, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                case ("POST", var p) when p.StartsWith("/direct-connect/sessions/") && p.EndsWith("/cancel", StringComparison.Ordinal):
                    {
                        var id = ExtractSessionId(p, "/direct-connect/sessions/", "/cancel");
                        var body = await ReadJsonBodyAsync<CancelDesktopSessionTurnRequest>(request, cancellationToken).ConfigureAwait(false);
                        if (body is null)
                        {
                            await WriteErrorAsync(response, HttpStatusCode.BadRequest, "Missing or invalid request body.", cancellationToken).ConfigureAwait(false);
                            return;
                        }
                        var result = await directConnectSessionService.CancelTurnAsync(id, body, cancellationToken).ConfigureAwait(false);
                        await WriteJsonAsync(response, result, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                case ("POST", var p) when p.StartsWith("/direct-connect/sessions/") && p.EndsWith("/resume", StringComparison.Ordinal):
                    {
                        var id = ExtractSessionId(p, "/direct-connect/sessions/", "/resume");
                        var body = await ReadJsonBodyAsync<ResumeInterruptedTurnRequest>(request, cancellationToken).ConfigureAwait(false);
                        if (body is null)
                        {
                            await WriteErrorAsync(response, HttpStatusCode.BadRequest, "Missing or invalid request body.", cancellationToken).ConfigureAwait(false);
                            return;
                        }
                        var result = await directConnectSessionService.ResumeInterruptedTurnAsync(id, body, cancellationToken).ConfigureAwait(false);
                        await WriteJsonAsync(response, result, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                case ("POST", var p) when p.StartsWith("/direct-connect/sessions/") && p.EndsWith("/dismiss", StringComparison.Ordinal):
                    {
                        var id = ExtractSessionId(p, "/direct-connect/sessions/", "/dismiss");
                        var body = await ReadJsonBodyAsync<DismissInterruptedTurnRequest>(request, cancellationToken).ConfigureAwait(false);
                        if (body is null)
                        {
                            await WriteErrorAsync(response, HttpStatusCode.BadRequest, "Missing or invalid request body.", cancellationToken).ConfigureAwait(false);
                            return;
                        }
                        var result = await directConnectSessionService.DismissInterruptedTurnAsync(id, body, cancellationToken).ConfigureAwait(false);
                        await WriteJsonAsync(response, result, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                case ("DELETE", var p) when p.StartsWith("/direct-connect/sessions/"):
                    {
                        var id = ExtractSessionId(p, "/direct-connect/sessions/", null);
                        var result = await directConnectSessionService.CloseSessionAsync(id, cancellationToken).ConfigureAwait(false);
                        await WriteJsonAsync(response, result, cancellationToken).ConfigureAwait(false);
                        return;
                    }
                default:
                    response.StatusCode = (int)HttpStatusCode.NotFound;
                    await WriteJsonAsync(response, new { error = "Unknown direct-connect route." }, cancellationToken).ConfigureAwait(false);
                    return;
            }
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Direct-connect request failed");
            try
            {
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                await WriteJsonAsync(context.Response, new { error = exception.Message }, CancellationToken.None).ConfigureAwait(false);
            }
            catch {}
        }
        finally
        {
            try
            {
                context.Response.Close();
            }
            catch { }
        }
    }

    private async Task StreamSessionEventsAsync(
        HttpListenerContext context,
        string directConnectSessionId,
        long afterSequence,
        CancellationToken cancellationToken)
    {
        var response = context.Response;
        response.StatusCode = (int)HttpStatusCode.OK;
        response.ContentType = "text/event-stream";
        response.Headers["Cache-Control"] = "no-cache";
        response.Headers["Connection"] = "keep-alive";
        response.Headers["X-Content-Type-Options"] = "nosniff";

        await WriteSseCommentAsync(response, "connected", cancellationToken).ConfigureAwait(false);

        await using var enumerator = directConnectSessionService
            .StreamEventsAsync(
                directConnectSessionId,
                afterSequence,
                cancellationToken)
            .GetAsyncEnumerator(cancellationToken);

        var moveNextTask = enumerator.MoveNextAsync().AsTask();
        while (!cancellationToken.IsCancellationRequested)
        {
            if (!moveNextTask.IsCompleted &&
                await Task.WhenAny(moveNextTask, Task.Delay(StreamHeartbeatInterval, cancellationToken)) != moveNextTask)
            {
                await WriteSseCommentAsync(response, "keep-alive", cancellationToken).ConfigureAwait(false);
                continue;
            }

            if (!await moveNextTask.ConfigureAwait(false))
            {
                break;
            }

            await WriteSseEventAsync(response, enumerator.Current, cancellationToken).ConfigureAwait(false);
            moveNextTask = enumerator.MoveNextAsync().AsTask();
        }
    }

    private static async Task WriteSseEventAsync(
        HttpListenerResponse response,
        DirectConnectSessionEventRecord record,
        CancellationToken cancellationToken)
    {
        await WriteStringAsync(response, $"id: {record.Sequence}\n", cancellationToken).ConfigureAwait(false);
        await WriteStringAsync(response, "event: session-event\n", cancellationToken).ConfigureAwait(false);
        var data = JsonSerializer.Serialize(record, StreamJsonOptions);
        foreach (var line in data.Split('\n'))
        {
            await WriteStringAsync(response, $"data: {line}\n", cancellationToken).ConfigureAwait(false);
        }
        await WriteStringAsync(response, "\n", cancellationToken).ConfigureAwait(false);
        response.OutputStream.Flush();
    }

    private static async Task WriteSseCommentAsync(
        HttpListenerResponse response,
        string comment,
        CancellationToken cancellationToken)
    {
        await WriteStringAsync(response, $": {comment}\n\n", cancellationToken).ConfigureAwait(false);
        response.OutputStream.Flush();
    }

    private static async Task WriteStringAsync(HttpListenerResponse response, string text, CancellationToken cancellationToken)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(text);
        await response.OutputStream.WriteAsync(bytes, cancellationToken).ConfigureAwait(false);
    }

    private async Task WriteJsonAsync<T>(HttpListenerResponse response, T payload, CancellationToken cancellationToken)
    {
        response.ContentType = "application/json; charset=utf-8";
        response.ContentEncoding = System.Text.Encoding.UTF8;
        await JsonSerializer.SerializeAsync(response.OutputStream, payload, StreamJsonOptions, cancellationToken).ConfigureAwait(false);
        response.OutputStream.Flush();
    }

    private static async Task WriteErrorAsync(HttpListenerResponse response, HttpStatusCode statusCode, string message, CancellationToken cancellationToken)
    {
        response.StatusCode = (int)statusCode;
        response.ContentType = "application/json; charset=utf-8";
        response.ContentEncoding = System.Text.Encoding.UTF8;
        await JsonSerializer.SerializeAsync(response.OutputStream, new { error = message }, StreamJsonOptions, cancellationToken).ConfigureAwait(false);
        response.OutputStream.Flush();
    }

    private static async Task<T?> ReadJsonBodyAsync<T>(HttpListenerRequest request, CancellationToken cancellationToken)
    {
        if (!request.HasEntityBody || request.ContentLength64 == 0)
        {
            return default;
        }
        await using var stream = request.InputStream;
        try
        {
            return await JsonSerializer.DeserializeAsync<T>(stream, StreamJsonOptions, cancellationToken).ConfigureAwait(false);
        }
        catch (JsonException)
        {
            using var buffered = new MemoryStream();
            await stream.CopyToAsync(buffered, cancellationToken).ConfigureAwait(false);
            if (buffered.Length == 0)
            {
                return default;
            }
            buffered.Position = 0;
            return await JsonSerializer.DeserializeAsync<T>(buffered, StreamJsonOptions, cancellationToken).ConfigureAwait(false);
        }
    }

    private static string ExtractSessionId(string path, string prefix, string? suffix)
    {
        var trimmed = path[prefix.Length..];
        if (suffix is not null && trimmed.EndsWith(suffix, StringComparison.Ordinal))
        {
            trimmed = trimmed[..^suffix.Length];
        }
        return trimmed.Trim('/');
    }

    private static long ParseLong(string? value)
        => long.TryParse(value, out var parsed) ? parsed : 0;

    private static int? ParseInt(string? value)
        => int.TryParse(value, out var parsed) ? parsed : null;

    private static bool IsAuthorized(HttpListenerRequest request, string expectedToken)
    {
        if (request.Headers["Authorization"] is { } authorization &&
            authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(authorization["Bearer ".Length..].Trim(), expectedToken, StringComparison.Ordinal))
        {
            return true;
        }

        var headerToken = request.Headers["X-Kurisu-Direct-Connect-Token"];
        return !string.IsNullOrEmpty(headerToken) &&
               string.Equals(headerToken, expectedToken, StringComparison.Ordinal);
    }

    private static string BuildListenPrefix(string host, int port)
    {
        var resolvedHost = string.IsNullOrWhiteSpace(host) ? "127.0.0.1" : host.Trim();
        return $"http://{resolvedHost}:{port}/";
    }

    private static int FindFreeTcpPort(string host)
    {
        var resolvedHost = string.IsNullOrWhiteSpace(host) ? "127.0.0.1" : host.Trim();
        var listener = new System.Net.Sockets.TcpListener(System.Net.IPAddress.Parse(resolvedHost), 0);
        listener.Start();
        try
        {
            return ((System.Net.IPEndPoint)listener.LocalEndpoint).Port;
        }
        finally
        {
            listener.Stop();
        }
    }

    private static string GenerateAccessToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }
}

file static class DirectConnectServerStateExtensions
{
    public static DirectConnectServerState WithListening(this DirectConnectServerState state, bool listening) =>
        new()
        {
            Enabled = state.Enabled,
            Listening = listening,
            BaseUrl = listening ? state.BaseUrl : string.Empty,
            AccessToken = state.AccessToken,
            Error = state.Error
        };
}