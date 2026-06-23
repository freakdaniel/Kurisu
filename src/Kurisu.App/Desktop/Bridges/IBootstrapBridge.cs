using Kurisu.Core.Models;

namespace Kurisu.App.Desktop.Bridges;

/// <summary>
/// Defines the contract for Desktop Bootstrap Projection Service
/// </summary>
public interface IBootstrapBridge
{
    /// <summary>
    /// Creates bootstrap
    /// </summary>
    /// <param name="currentLocale">The current locale</param>
    /// <returns>The resulting app bootstrap payload</returns>
    AppBootstrapPayload CreateBootstrap(string currentLocale);
}
