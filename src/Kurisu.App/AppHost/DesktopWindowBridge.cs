using System.Diagnostics;
using InfiniFrame;
using Microsoft.Extensions.Logging;
using Kurisu.Core.Models;

namespace Kurisu.App.AppHost;

/// <summary>
/// Defines access to the active native desktop window.
/// </summary>
public interface IDesktopWindowBridge
{
    /// <summary>
    /// Attaches the active window instance.
    /// </summary>
    /// <param name="window">The active window.</param>
    void AttachWindow(IInfiniFrameWindow window);

    /// <summary>
    /// Publishes a raw message to the renderer.
    /// </summary>
    /// <param name="message">The serialized message.</param>
    Task PublishAsync(string message);

    /// <summary>
    /// Opens a project directory picker.
    /// </summary>
    /// <returns>The directory selection result.</returns>
    Task<SelectProjectDirectoryResult> SelectProjectDirectoryAsync();

    /// <summary>
    /// Opens the specified URL using the host operating system.
    /// </summary>
    /// <param name="url">The URL to open.</param>
    /// <returns><c>true</c> when the URL was opened.</returns>
    bool OpenExternalUrl(string url);
}

/// <summary>
/// Provides access to the current InfiniFrame window for shell actions.
/// </summary>
public sealed class DesktopWindowBridge(ILogger<DesktopWindowBridge> logger) : IDesktopWindowBridge
{
    private readonly object _sync = new();
    private IInfiniFrameWindow? _window;

    /// <inheritdoc />
    public void AttachWindow(IInfiniFrameWindow window)
    {
        lock (_sync)
        {
            _window = window;
        }
    }

    /// <inheritdoc />
    public Task PublishAsync(string message)
    {
        var window = GetWindow();
        window.Invoke(() => window.SendWebMessage(message));
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task<SelectProjectDirectoryResult> SelectProjectDirectoryAsync()
    {
        var window = GetWindow();
        var selectedPath = string.Empty;

        window.Invoke(() =>
        {
            selectedPath = window.ShowOpenFolder(
                "Select project directory",
                Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments))
                ?.FirstOrDefault() ?? string.Empty;
        });

        return Task.FromResult(new SelectProjectDirectoryResult
        {
            Cancelled = string.IsNullOrWhiteSpace(selectedPath),
            SelectedPath = selectedPath
        });
    }

    /// <inheritdoc />
    public bool OpenExternalUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp &&
             uri.Scheme != Uri.UriSchemeHttps &&
             uri.Scheme != Uri.UriSchemeMailto))
        {
            return false;
        }

        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri)
            {
                UseShellExecute = true
            });
            return true;
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Failed to open external URL {Url}", url);
            return false;
        }
    }

    private IInfiniFrameWindow GetWindow()
    {
        lock (_sync)
        {
            return _window ?? throw new InvalidOperationException("Desktop window has not been attached yet.");
        }
    }
}
