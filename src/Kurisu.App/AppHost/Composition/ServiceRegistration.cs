using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Kurisu.App.Desktop.Bridges;
using Kurisu.App.Desktop.DirectConnect;
using Kurisu.Core.Agents;
using Kurisu.Core.Auth;
using Kurisu.Core.Channels;
using Kurisu.Core.Compatibility;
using Kurisu.Core.Config;
using Kurisu.Core.Extensions;
using Kurisu.Core.Followup;
using Kurisu.Core.Hooks;
using Kurisu.Core.Ide;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Mcp;
using Kurisu.Core.Output;
using Kurisu.Core.Permissions;
using Kurisu.Core.Prompts;
using Kurisu.Core.Runtime;
using Kurisu.Core.Sessions;
using Kurisu.Core.Telemetry;
using Kurisu.Core.Tools;
using Kurisu.App.Ipc.Binding;
using Kurisu.App.Desktop.State;

namespace Kurisu.App.AppHost.Composition;

/// <summary>
/// Single entry point for wiring up the Kurisu desktop host.
/// Groups registrations into <c>Options</c>, <c>Core</c>, <c>Bridges</c>,
/// and <c>App host</c> sections so the full DI graph is visible in one file.
/// </summary>
public static class ServiceRegistration
{
    /// <summary>
    /// Adds every service the desktop host needs: configuration-bound
    /// options, the Core domain services, the desktop bridges that adapt
    /// those services to the IPC surface, and the host-side infrastructure
    /// (IPC dispatch, Electron bridge, window bridge).
    /// </summary>
    public static IServiceCollection AddDesktopShellServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        #region Options
        services.AddOptions<DesktopShellOptions>()
            .Bind(configuration.GetSection(DesktopShellOptions.SectionName));
        services.AddOptions<NativeAssistantRuntimeOptions>()
            .Bind(configuration.GetSection(NativeAssistantRuntimeOptions.SectionName));
        services.AddOptions<DirectConnectServerOptions>()
            .Bind(configuration.GetSection(DirectConnectServerOptions.SectionName));
        #endregion

        #region Core domain services
        services
            .AddInfrastructureServices()
            .AddConfigServices()
            .AddAuthServices()
            .AddChannelServices()
            .AddCompatibilityServices()
            .AddExtensionServices()
            .AddHookServices()
            .AddIdeServices()
            .AddPermissionServices()
            .AddTelemetryServices()
            .AddRuntimeServices()
            .AddMcpServices()
            .AddPromptServices()
            .AddFollowupServices()
            .AddOutputServices()
            .AddAgentServices()
            .AddToolServices()
            .AddSessionServices();
        #endregion

        #region Desktop bridges (IPC-facing adapters over Core)
        services.AddDesktopBridges();
        #endregion

        #region App host (IPC dispatch and Electron wiring)
        services.AddSingleton<DesktopIpcService>();
        services.AddSingleton<IDesktopWindowBridge, DesktopWindowBridge>();
        services.AddSingleton<ElectronDesktopBridgeService>();
        #endregion

        return services;
    }
}
