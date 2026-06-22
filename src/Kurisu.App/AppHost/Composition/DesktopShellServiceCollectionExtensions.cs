using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Kurisu.Core.Agents;
using Kurisu.Core.Auth;
using Kurisu.Core.Channels;
using Kurisu.Core.Compatibility;
using Kurisu.Core.Config;
using Kurisu.App.Desktop;
using Kurisu.App.Desktop.DirectConnect;
using Kurisu.Core.Extensions;
using Kurisu.Core.Hooks;
using Kurisu.Core.Ide;
using Kurisu.App.Ipc;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Mcp;
using Kurisu.App.Options;
using Kurisu.Core.Permissions;
using Kurisu.Core.Prompts;
using Kurisu.Core.Runtime;
using Kurisu.Core.Sessions;
using Kurisu.Core.Tools;
using Kurisu.Core.Telemetry;
using Kurisu.Core.Followup;
using Kurisu.Core.Output;
using Kurisu.Core.Models;

namespace Kurisu.App.AppHost;

/// <summary>
/// Provides extension members for Desktop Shell Service Collection
/// </summary>
public static class DesktopShellServiceCollectionExtensions
{
    /// <summary>
    /// Executes add desktop shell services
    /// </summary>
    /// <param name="services">The services</param>
    /// <param name="configuration">The configuration to apply</param>
    /// <returns>The resulting i service collection</returns>
    public static IServiceCollection AddDesktopShellServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddOptions<DesktopShellOptions>()
            .Bind(configuration.GetSection(DesktopShellOptions.SectionName));
        services.AddOptions<NativeAssistantRuntimeOptions>()
            .Bind(configuration.GetSection(NativeAssistantRuntimeOptions.SectionName));
        services.AddOptions<DirectConnectServerOptions>()
            .Bind(configuration.GetSection(DirectConnectServerOptions.SectionName));

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
            .AddSessionServices()
            .AddDesktopServices()
            .AddAppHostServices();

        return services;
    }
}
