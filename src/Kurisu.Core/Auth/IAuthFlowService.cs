using Kurisu.Core.Models;

namespace Kurisu.Core.Auth;

/// <summary>
/// Defines the contract for Auth Flow Service
/// </summary>
public interface IAuthFlowService
{
    /// <summary>
    /// Occurs when Auth Changed
    /// </summary>
    event EventHandler<AuthStatusSnapshot>? AuthChanged;

    /// <summary>
    /// Gets status
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <returns>The resulting auth status snapshot</returns>
    AuthStatusSnapshot GetStatus(WorkspacePaths paths);

    /// <summary>
    /// Executes configure open ai compatible async
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <param name="request">The request payload</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    Task<AuthStatusSnapshot> ConfigureOpenAiCompatibleAsync(
        WorkspacePaths paths,
        ConfigureOpenAiCompatibleAuthRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes configure coding plan async
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <param name="request">The request payload</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    Task<AuthStatusSnapshot> ConfigureCodingPlanAsync(
        WorkspacePaths paths,
        ConfigureCodingPlanAuthRequest request,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Disconnects async
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <param name="request">The request payload</param>
    /// <param name="cancellationToken">The token that can be used to cancel the operation</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    Task<AuthStatusSnapshot> DisconnectAsync(
        WorkspacePaths paths,
        DisconnectAuthRequest request,
        CancellationToken cancellationToken = default);
}
