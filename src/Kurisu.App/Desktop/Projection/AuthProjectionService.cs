using Microsoft.Extensions.Options;
using Kurisu.Core.Auth;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Models;
using Kurisu.App.Options;

namespace Kurisu.App.Desktop;

/// <summary>
/// Represents the Auth Projection Service
/// </summary>
/// <param name="options">The options</param>
/// <param name="workspacePathResolver">The workspace path resolver</param>
/// <param name="authFlowService">The auth flow service</param>
public sealed class AuthProjectionService(
    IOptions<DesktopShellOptions> options,
    IWorkspacePathResolver workspacePathResolver,
    IAuthFlowService authFlowService) : IDesktopAuthProjectionService
{
    private readonly DesktopShellOptions shellOptions = options.Value;

    /// <summary>
    /// Occurs when Auth Changed
    /// </summary>
    public event EventHandler<AuthStatusSnapshot>? AuthChanged
    {
        add => authFlowService.AuthChanged += value;
        remove => authFlowService.AuthChanged -= value;
    }

    /// <summary>
    /// Creates snapshot
    /// </summary>
    /// <returns>The resulting auth status snapshot</returns>
    public AuthStatusSnapshot CreateSnapshot() => authFlowService.GetStatus(ResolveWorkspace());

    /// <summary>
    /// Executes configure open ai compatible async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    public Task<AuthStatusSnapshot> ConfigureOpenAiCompatibleAsync(ConfigureOpenAiCompatibleAuthRequest request) =>
        authFlowService.ConfigureOpenAiCompatibleAsync(ResolveWorkspace(), request);

    /// <summary>
    /// Executes configure coding plan async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    public Task<AuthStatusSnapshot> ConfigureCodingPlanAsync(ConfigureCodingPlanAuthRequest request) =>
        authFlowService.ConfigureCodingPlanAsync(ResolveWorkspace(), request);

    /// <summary>
    /// Disconnects async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    public Task<AuthStatusSnapshot> DisconnectAsync(DisconnectAuthRequest request) =>
        authFlowService.DisconnectAsync(ResolveWorkspace(), request);

    private WorkspacePaths ResolveWorkspace() => workspacePathResolver.Resolve(shellOptions.Workspace);
}
