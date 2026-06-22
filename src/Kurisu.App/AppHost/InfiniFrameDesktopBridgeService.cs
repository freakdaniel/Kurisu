using System.Text.Json;
using System.Text.Json.Serialization;
using InfiniFrame;
using Microsoft.Extensions.Logging;
using Kurisu.App.Ipc;

namespace Kurisu.App.AppHost;

/// <summary>
/// Wires <see cref="DesktopIpcService"/> channels to the InfiniFrame window
/// using the v2 typed envelope protocol and pushes events back to the renderer
/// as envelope messages.
/// </summary>
public sealed class InfiniFrameDesktopBridgeService(
    DesktopIpcService desktopIpcService,
    IDesktopWindowBridge windowBridge,
    ILogger<InfiniFrameDesktopBridgeService> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private int _initialized;
    private int _eventsRegistered;

    /// <summary>
    /// Registers per-channel post handlers on the window, wires up event push
    /// from <see cref="DesktopIpcService"/>, and registers the open-external
    /// message handler used by the renderer's link interception.
    /// </summary>
    /// <param name="window">The active window.</param>
    public void Initialize(IInfiniFrameWindow window)
    {
        windowBridge.AttachWindow(window);

        if (Interlocked.Exchange(ref _initialized, 1) != 0)
        {
            return;
        }

        RegisterBuiltInHandlers(window);
        RegisterIpcPostHandlers(window);
        RegisterEventPush(window);
    }

    private void RegisterBuiltInHandlers(IInfiniFrameWindow window)
    {
        window.RegisterWebMessageGetHandler(InfiniFrameInterop.OpenExternalMessageId, (_, payload) =>
            HandleOpenExternal(payload));

        window.RegisterWebMessagePostHandler(InfiniFrameInterop.ReadyMessageId, (_, _) => { });
    }

    private void RegisterIpcPostHandlers(IInfiniFrameWindow window)
    {
        foreach (var binding in desktopIpcService.InvokeBindings.Values)
        {
            window.RegisterWebMessagePostHandler(binding.Channel, (_, payload) =>
                HandleIpcPostAsync(window, binding, payload));
        }

        logger.LogInformation(
            "Registered {Count} IPC post handlers on InfiniFrame window",
            desktopIpcService.InvokeBindings.Count);
    }

    private async Task HandleIpcPostAsync(IInfiniFrameWindow window, InvokeBinding binding, string? payload)
    {
        var requestId = ExtractRequestId(payload);
        var innerPayload = ExtractInnerPayload(payload);
        try
        {
            var result = await desktopIpcService
                .InvokeChannelAsync(binding.Channel, innerPayload)
                .ConfigureAwait(false);
            var dataJson = JsonSerializer.Serialize(result, JsonOptions);
            SendGetResponse(window, requestId, dataJson, error: null);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "IPC post failed for {Channel}", binding.Channel);
            SendGetResponse(window, requestId, dataJson: null, exception.Message);
        }
    }

    private string? HandleOpenExternal(string? payload)
    {
        var url = ExtractUrl(payload);
        if (string.IsNullOrWhiteSpace(url))
        {
            return JsonSerializer.Serialize(new { opened = false }, JsonOptions);
        }

        var opened = windowBridge.OpenExternalUrl(url);
        return JsonSerializer.Serialize(new { opened }, JsonOptions);
    }

    private void RegisterEventPush(IInfiniFrameWindow window)
    {
        if (Interlocked.Exchange(ref _eventsRegistered, 1) != 0)
        {
            return;
        }

        desktopIpcService.RegisterEventChannels((channel, payload) =>
        {
            PublishEvent(window, channel, payload);
        });
    }

    private void PublishEvent(IInfiniFrameWindow window, string channel, object? payload)
    {
        try
        {
            var dataJson = JsonSerializer.Serialize(payload, JsonOptions);
            var envelope = InfiniFrameInterop.CreateEnvelope(channel, dataJson);
            window.SendWebMessage(envelope);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to publish event {Channel} to renderer", channel);
        }
    }

    private static void SendGetResponse(IInfiniFrameWindow window, string? requestId, string? dataJson, string? error)
    {
        if (string.IsNullOrEmpty(requestId))
        {
            return;
        }

        try
        {
            var envelope = string.IsNullOrEmpty(error)
                ? InfiniFrameInterop.CreateGetSuccessResponse(requestId, dataJson ?? "null")
                : InfiniFrameInterop.CreateGetErrorResponse(requestId, error);
            window.SendWebMessage(envelope);
        }
        catch
        {
            // The renderer will time out and surface its own error.
        }
    }

    private static string? ExtractRequestId(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
        {
            return null;
        }

        try
        {
            using var document = JsonDocument.Parse(payload);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return null;
            }
            if (document.RootElement.TryGetProperty("requestId", out var idElement) &&
                idElement.ValueKind == JsonValueKind.String)
            {
                return idElement.GetString();
            }
        }
        catch (JsonException)
        {
        }

        return null;
    }

    private static string? ExtractInnerPayload(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
        {
            return payload;
        }

        try
        {
            using var document = JsonDocument.Parse(payload);
            if (document.RootElement.ValueKind == JsonValueKind.Object &&
                document.RootElement.TryGetProperty("payload", out var inner))
            {
                return inner.ValueKind switch
                {
                    JsonValueKind.Null => "null",
                    JsonValueKind.String => inner.GetString(),
                    _ => inner.GetRawText()
                };
            }
        }
        catch (JsonException)
        {
        }

        return payload;
    }

    private static string ExtractUrl(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload))
        {
            return string.Empty;
        }

        try
        {
            using var document = JsonDocument.Parse(payload);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
            {
                return string.Empty;
            }
            if (document.RootElement.TryGetProperty("url", out var urlElement) &&
                urlElement.ValueKind == JsonValueKind.String)
            {
                return urlElement.GetString() ?? string.Empty;
            }
        }
        catch (JsonException)
        {
        }

        return string.Empty;
    }
}
