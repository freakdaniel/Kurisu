namespace Kurisu.Core.Models;

/// <summary>
/// Represents a built-in provider preset surfaced in the auth screen.
/// </summary>
public sealed record ProviderPreset(
    string Id,
    string Name,
    string Description,
    string Family,
    string? DefaultBaseUrl,
    string? DefaultModelId,
    IReadOnlyList<string> ApiKeyEnvVars,
    IReadOnlyList<string> Capabilities,
    int Popularity,
    string? DocsUrl,
    string? ModelsSourceUrl,
    IReadOnlyDictionary<string, string>? ModelsSourceHeaders);

/// <summary>
/// IPC-safe projection of <see cref="ProviderPreset"/> sent to the renderer.
/// Excludes the API key env-var list (kept server-side) and a few internal flags.
/// </summary>
public sealed record ProviderPresetSnapshot(
    string Id,
    string Name,
    string Description,
    string Family,
    string? DefaultBaseUrl,
    string? DefaultModelId,
    IReadOnlyList<string> Capabilities,
    int Popularity,
    string? DocsUrl,
    string? ModelsSourceUrl);
