using Kurisu.Core.Models;

namespace Kurisu.App.Desktop;

/// <summary>
/// Defines the contract for Desktop Auth Projection Service
/// </summary>
public interface IDesktopAuthProjectionService
{
    /// <summary>
    /// Occurs when Auth Changed
    /// </summary>
    event EventHandler<AuthStatusSnapshot>? AuthChanged;

    /// <summary>
    /// Creates snapshot
    /// </summary>
    /// <returns>The resulting auth status snapshot</returns>
    AuthStatusSnapshot CreateSnapshot();

    /// <summary>
    /// Executes configure open ai compatible async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    Task<AuthStatusSnapshot> ConfigureOpenAiCompatibleAsync(ConfigureOpenAiCompatibleAuthRequest request);

    /// <summary>
    /// Executes configure coding plan async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    Task<AuthStatusSnapshot> ConfigureCodingPlanAsync(ConfigureCodingPlanAuthRequest request);

    /// <summary>
    /// Disconnects async
    /// </summary>
    /// <param name="request">The request payload</param>
    /// <returns>A task that resolves to auth status snapshot</returns>
    Task<AuthStatusSnapshot> DisconnectAsync(DisconnectAuthRequest request);
}
