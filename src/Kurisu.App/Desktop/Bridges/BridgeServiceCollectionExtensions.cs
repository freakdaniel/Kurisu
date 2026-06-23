using Microsoft.Extensions.DependencyInjection;
using Kurisu.App.Desktop.DirectConnect;
using Kurisu.Core.Models;
using Kurisu.App.Desktop.State;

namespace Kurisu.App.Desktop.Bridges;

/// <summary>
/// Provides extension members for Desktop Service Collection
/// </summary>
public static class BridgeServiceCollectionExtensions
{
    /// <summary>
    /// Executes add desktop services
    /// </summary>
    /// <param name="services">The services</param>
    /// <returns>The resulting i service collection</returns>
    public static IServiceCollection AddDesktopBridges(this IServiceCollection services)
    {
        services.AddSingleton<ILocaleStateService, LocaleStateService>();
        services.AddSingleton<IBootstrapBridge, BootstrapBridge>();
        services.AddSingleton<IArenaBridge, ArenaBridge>();
        services.AddSingleton<IAuthBridge, AuthBridge>();
        services.AddSingleton<IChannelBridge, ChannelBridge>();
        services.AddSingleton<IMcpBridge, McpBridge>();
        services.AddSingleton<IPromptBridge, PromptBridge>();
        services.AddSingleton<IMcpResourceBridge, McpResourceBridge>();
        services.AddSingleton<IFollowupBridge, FollowupBridge>();
        services.AddSingleton<IExtensionBridge, ExtensionBridge>();
        services.AddSingleton<IWorkspaceBridge, WorkspaceBridge>();
        services.AddSingleton<ISessionBridge, SessionBridge>();
        services.AddSingleton<ISessionEventPublisher>(sp =>
            (ISessionEventPublisher)sp.GetRequiredService<ISessionBridge>());
        services.AddSingleton<IDirectConnectSessionService, DirectConnectSessionService>();
        services.AddSingleton<IDirectConnectServerHost, DirectConnectHttpServerHost>();
        services.AddSingleton<ISessionTitleGenerationService, SessionTitleGenerationService>();
        services.AddSingleton<IDesktopSurface, DesktopFacade>();

        return services;
    }
}
