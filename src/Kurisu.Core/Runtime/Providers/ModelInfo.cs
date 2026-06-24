namespace Kurisu.Core.Runtime.Providers;

/// <summary>
/// Minimal metadata about a single model: identifier, display name, context
/// window. Stored alongside provider manifests as a fallback when the live
/// model list endpoint is unavailable or rate-limited.
/// </summary>
/// <param name="Id">Model identifier (e.g. <c>gpt-4o</c>).</param>
/// <param name="DisplayName">Human-readable name.</param>
/// <param name="ContextWindowSize">Maximum input tokens.</param>
public sealed record ModelInfo(
    string Id,
    string DisplayName,
    int ContextWindowSize);