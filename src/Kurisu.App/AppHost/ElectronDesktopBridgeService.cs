using System.Text.Json;
using ElectronNET.API;
using Kurisu.App.Ipc.Binding;
using Microsoft.Extensions.Logging;

namespace Kurisu.App.AppHost;

/// <summary>
/// Wires <see cref="DesktopIpcService"/> channels to the active Electron
/// <see cref="BrowserWindow"/> using plain <c>ipcMain</c> / <c>ipcRenderer</c>
/// with one channel per invoke handler and a <c>:reply</c> suffix for the
/// JSON-encoded response payload.
/// </summary>
public sealed class ElectronDesktopBridgeService(
    DesktopIpcService desktopIpcService,
    IDesktopWindowBridge windowBridge,
    ILogger<ElectronDesktopBridgeService> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    private int _initialized;
    private int _eventsRegistered;

    private const string OpenExternalChannel = "__kurisu:open-external";
    private const string ReplySuffix = ":reply";

    /// <summary>
    /// Attaches the active window, registers every invoke channel declared
    /// on <see cref="DesktopIpcService"/> with the Electron main process,
    /// wires the open-external helper, and starts server-push event delivery.
    /// </summary>
    /// <param name="window">The active Electron browser window.</param>
    public void Initialize(BrowserWindow window)
    {
        windowBridge.AttachWindow(window);

        if (Interlocked.Exchange(ref _initialized, 1) != 0)
            return;

        RegisterInvokeHandlers();
        RegisterOpenExternalHandler();
        RegisterEventPush();

        logger.LogInformation(
            "Registered {Count} IPC channels on Electron main process",
            desktopIpcService.InvokeBindings.Count);
    }

    private void RegisterInvokeHandlers()
    {
        foreach (var binding in desktopIpcService.InvokeBindings.Values)
        {
            var channel = binding.Channel;
            var replyChannel = channel + ReplySuffix;
            Electron.IpcMain.On(channel, args =>
            {
                var raw = ExtractFirstArg(args);
                _ = HandleIpcPostAsync(channel, replyChannel, raw);
            });
        }
    }

    private void RegisterOpenExternalHandler()
    {
        Electron.IpcMain.On(OpenExternalChannel, args =>
        {
            var url = ExtractUrl(ExtractFirstArg(args));
            var opened = !string.IsNullOrWhiteSpace(url) && windowBridge.OpenExternalUrl(url);
            SendReply(OpenExternalChannel + ReplySuffix, JsonSerializer.Serialize(new { opened }, JsonOptions));
        });
    }

    private void RegisterEventPush()
    {
        if (Interlocked.Exchange(ref _eventsRegistered, 1) != 0)
            return;

        desktopIpcService.RegisterEventChannels(PublishEvent);
    }

    private async Task HandleIpcPostAsync(string channel, string replyChannel, string rawPayload)
    {
        try
        {
            var result = await desktopIpcService
                .InvokeChannelAsync(channel, rawPayload)
                .ConfigureAwait(false);
            var dataJson = JsonSerializer.Serialize(result, JsonOptions);
            SendReply(replyChannel, dataJson);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "IPC invoke failed for {Channel}", channel);
            SendReply(replyChannel, JsonSerializer.Serialize(new { error = exception.Message }, JsonOptions));
        }
    }

    private void PublishEvent(string channel, object? payload)
    {
        var window = windowBridge.TryGetWindow();
        if (window is null)
            return;

        try
        {
            var dataJson = JsonSerializer.Serialize(payload, JsonOptions);
            Electron.IpcMain.Send(window, channel, dataJson);
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to publish event {Channel} to renderer", channel);
        }
    }

    private void SendReply(string replyChannel, string dataJson)
    {
        var window = windowBridge.TryGetWindow();
        if (window is null)
            return;

        try
        {
            Electron.IpcMain.Send(window, replyChannel, dataJson);
        }
        catch (Exception exception)
        {
            logger.LogDebug(exception, "Failed to send reply on {Channel}", replyChannel);
        }
    }

    private static string ExtractUrl(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return string.Empty;

        try
        {
            using var document = JsonDocument.Parse(raw);
            if (document.RootElement.ValueKind != JsonValueKind.Object)
                return string.Empty;

            if (document.RootElement.TryGetProperty("url", out var urlElement) &&
                urlElement.ValueKind == JsonValueKind.String)
                return urlElement.GetString() ?? string.Empty;
        }
        catch (JsonException)
        {
        }

        return string.Empty;
    }

    /// <summary>
    /// Normalises the <c>args</c> object delivered by Electron's
    /// <c>ipcMain.on(channel, listener)</c> callback into a single JSON-encoded
    /// payload string. Electron forwards the renderer's
    /// <c>ipcRenderer.send(channel, ...)</c> arguments as-is; they can arrive
    /// as either a single value (when the renderer sent one argument) or an
    /// <c>object[]</c>
    /// </summary>
    private static string ExtractFirstArg(object? args)
    {
        if (args is null)
            return "null";

        if (args is string raw)
            return raw;

        if (args is object?[] arr)
        {
            if (arr.Length == 0)
                return "null";

            return JsonSerializer.Serialize(arr[0], JsonOptions);
        }

        return JsonSerializer.Serialize(args, JsonOptions);
    }
}