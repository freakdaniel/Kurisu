using ElectronNET;
using ElectronNET.API;
using ElectronNET.API.Entities;
using ElectronNET.Runtime;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Serilog;
using Kurisu.App.Ipc;

namespace Kurisu.App.AppHost.Hosting;

/// <summary>
/// Configures the Electron <see cref="BrowserWindow"/>, registers extra
/// Chromium command-line flags, wires Electron lifecycle hooks, and kicks
/// off the application's <see cref="Bootstrapper"/>.
/// </summary>
internal static class ElectronWindowBootstrap
{
    private const string ChromiumArguments =
        "--disable-features=SpareRendererForSitePerProcess,BackForwardCache,Translate " +
        "--disable-dev-shm-usage ";

    public static async Task LaunchAsync(
        IServiceProvider services,
        IConfiguration configuration,
        IElectronNetRuntimeController runtimeController)
    {
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("Kurisu.App");
        var bridge = services.GetRequiredService<ElectronDesktopBridgeService>();

        ElectronNetRuntime.ElectronExtraArguments = ChromiumArguments;

        EnsureRendererExists();

        var window = await Electron.WindowManager.CreateWindowAsync(
            BuildWindowOptions(configuration),
            BuildRendererUrl());

        bridge.Initialize(window);

        Electron.App.WindowAllClosed += () =>
        {
            if (!OperatingSystem.IsMacOS())
                Electron.App.Quit();
        };

        window.OnReadyToShow += () =>
        {
            window.Center();
            window.Show();
        };

        var bootstrapTask = Bootstrapper.StartAsync(services, configuration);
        _ = bootstrapTask.ContinueWith(
            task => Log.Logger.Error(task.Exception, "Desktop bootstrap services failed during startup"),
            TaskContinuationOptions.OnlyOnFaulted);

        Electron.Menu.SetApplicationMenu([]);
    }

    private static BrowserWindowOptions BuildWindowOptions(IConfiguration configuration)
    {
        var productName = configuration["DesktopShell:ProductName"] ?? "Kurisu";
        var options = new BrowserWindowOptions
        {
            Show = false,
            Title = productName,
            Width = 1280,
            Height = 720,
            MinWidth = 1200,
            MinHeight = 720,
            Center = true,
            BackgroundColor = "#0D0D10",
            Icon = ResolveWindowIconPath(),
            WebPreferences = new WebPreferences
            {
                WebviewTag = false,
                DevTools = true,
            },
            #pragma warning disable CA1416
            AutoHideMenuBar = true
            #pragma warning restore CA1416
        };

        return options;
    }

    private static void EnsureRendererExists()
    {
        var wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
        var indexPath = Path.Combine(wwwroot, "index.html");
        if (!File.Exists(indexPath))
        {
            throw new FileNotFoundException(
                "Renderer entrypoint was not found. Make sure the Vite frontend was built before launching the desktop host.",
                indexPath);
        }
    }

    private static string BuildRendererUrl()
    {
        var indexPath = Path.Combine(AppContext.BaseDirectory, "wwwroot", "index.html");
        return new Uri(indexPath, UriKind.Absolute).AbsoluteUri;
    }

    /// <summary>
    /// Resolves the icon file that Electron should use for the window title
    /// bar and Alt-Tab view. Looks for <c>icon.png</c> next to the renderer
    /// assets; returns an empty string when no icon is bundled so Electron
    /// falls back to its default.
    /// </summary>
    private static string ResolveWindowIconPath()
    {
        var candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "wwwroot", "icon.png"),
            Path.Combine(AppContext.BaseDirectory, "Build", "icon.png"),
            Path.Combine(AppContext.BaseDirectory, "icon.png")
        };

        foreach (var candidate in candidates)
            if (File.Exists(candidate))
                return candidate;

        return string.Empty;
    }
}
