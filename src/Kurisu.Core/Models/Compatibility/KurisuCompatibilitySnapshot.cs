namespace Kurisu.Core.Models;

/// <summary>
/// Represents the Kurisu Compatibility Snapshot
/// </summary>
public sealed class KurisuCompatibilitySnapshot
{
    /// <summary>
    /// Gets or sets the project root
    /// </summary>
    public required string ProjectRoot { get; init; }

    /// <summary>
    /// Gets or sets the default context file name
    /// </summary>
    public required string DefaultContextFileName { get; init; }

    /// <summary>
    /// Gets or sets the settings layers
    /// </summary>
    public required IReadOnlyList<KurisuCompatibilityLayer> SettingsLayers { get; init; }

    /// <summary>
    /// Gets or sets the surface directories
    /// </summary>
    public required IReadOnlyList<KurisuSurfaceDirectory> SurfaceDirectories { get; init; }

    /// <summary>
    /// Gets or sets the commands
    /// </summary>
    public required IReadOnlyList<KurisuCommandSurface> Commands { get; init; }

    /// <summary>
    /// Gets or sets the skills
    /// </summary>
    public required IReadOnlyList<KurisuSkillSurface> Skills { get; init; }
}
