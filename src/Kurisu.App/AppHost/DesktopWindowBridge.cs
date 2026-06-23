using ElectronNET.API;
using ElectronNET.API.Entities;
using Kurisu.Core.Models;
using Microsoft.Extensions.Logging;

namespace Kurisu.App.AppHost;

/// <summary>
/// Defines access to the active Electron desktop window.
/// </summary>
public interface IDesktopWindowBridge
{
    /// <summary>
    /// Attaches the active Electron window instance.
    /// </summary>
    void AttachWindow(BrowserWindow window);

    /// <summary>
    /// Returns the currently attached window or <c>null</c> when no window
    /// has been registered yet. This is used for non-fatal pushes such as
    /// event delivery.
    /// </summary>
    BrowserWindow? TryGetWindow();

    /// <summary>
    /// Opens a project directory picker using Electron's native dialog API.
    /// </summary>
    Task<SelectProjectDirectoryResult> SelectProjectDirectoryAsync();

    /// <summary>
    /// Opens the specified URL using the host operating system.
    /// </summary>
    bool OpenExternalUrl(string url);
}

/// <summary>
/// Provides access to the current Electron window for shell actions such as
/// picking a project directory and opening external links.
/// </summary>
public sealed class DesktopWindowBridge(ILogger<DesktopWindowBridge> logger) : IDesktopWindowBridge
{
    private readonly object _sync = new();
    private BrowserWindow? _window;

    /// <inheritdoc />
    public void AttachWindow(BrowserWindow window)
    {
        lock (_sync)
        {
            _window = window;
        }
    }

    /// <inheritdoc />
    public BrowserWindow? TryGetWindow()
    {
        lock (_sync)
        {
            return _window;
        }
    }

    /// <inheritdoc />
    public async Task<SelectProjectDirectoryResult> SelectProjectDirectoryAsync()
    {
        var window = GetWindow();
        var options = new OpenDialogOptions
        {
            Title = "Select project directory",
            DefaultPath = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
            Properties = new[] { OpenDialogProperty.openDirectory }
        };

        string[]? selected;
        try
        {
            selected = await Electron.Dialog.ShowOpenDialogAsync(window, options).ConfigureAwait(false);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Failed to show open-folder dialog");
            selected = Array.Empty<string>();
        }

        var path = selected is { Length: > 0 } ? selected[0] : string.Empty;
        return new SelectProjectDirectoryResult
        {
            Cancelled = string.IsNullOrWhiteSpace(path),
            SelectedPath = path
        };
    }

    /// <inheritdoc />
    public bool OpenExternalUrl(string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp &&
             uri.Scheme != Uri.UriSchemeHttps &&
             uri.Scheme != Uri.UriSchemeMailto))
            return false;

        try
        {
            var error = Electron.Shell.OpenExternalAsync(uri.AbsoluteUri).GetAwaiter().GetResult();
            return string.IsNullOrEmpty(error);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Failed to open external URL {Url}", url);
            return false;
        }
    }

    private BrowserWindow GetWindow()
    {
        lock (_sync)
        {
            return _window ?? throw new InvalidOperationException("Electron window has not been attached yet.");
        }
    }
}
