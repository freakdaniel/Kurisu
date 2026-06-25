namespace Kurisu.Core.Compatibility;

/// <summary>
/// Defines the contract for Settings Resolver
/// </summary>
public interface ISettingsResolver
{
    /// <summary>
    /// Executes inspect compatibility
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <returns>The resulting kurisu compatibility snapshot</returns>
    KurisuCompatibilitySnapshot InspectCompatibility(WorkspacePaths paths);

    /// <summary>
    /// Executes inspect runtime profile
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <returns>The resulting kurisu runtime profile</returns>
    KurisuRuntimeProfile InspectRuntimeProfile(WorkspacePaths paths);
}
