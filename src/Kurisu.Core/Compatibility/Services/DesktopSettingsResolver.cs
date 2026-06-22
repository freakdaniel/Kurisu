using Kurisu.Core.Models;

namespace Kurisu.Core.Compatibility;

/// <summary>
/// Represents the Desktop Settings Resolver
/// </summary>
/// <param name="compatibilityService">The compatibility service</param>
/// <param name="runtimeProfileService">The runtime profile service</param>
public sealed class DesktopSettingsResolver(
    KurisuCompatibilityService compatibilityService,
    KurisuRuntimeProfileService runtimeProfileService) : ISettingsResolver
{
    /// <summary>
    /// Executes inspect compatibility
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <returns>The resulting kurisu compatibility snapshot</returns>
    public KurisuCompatibilitySnapshot InspectCompatibility(WorkspacePaths paths) =>
        compatibilityService.Inspect(paths);

    /// <summary>
    /// Executes inspect runtime profile
    /// </summary>
    /// <param name="paths">The paths to process</param>
    /// <returns>The resulting kurisu runtime profile</returns>
    public KurisuRuntimeProfile InspectRuntimeProfile(WorkspacePaths paths) =>
        runtimeProfileService.Inspect(paths);
}
