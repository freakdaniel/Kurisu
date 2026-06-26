namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Wire-format status strings for the multi-provider
/// <c>ProviderStatusSnapshot.Status</c> field exposed to the UI.
/// </summary>
public static class ProviderStatusKind
{
    /// <summary>Provider has an API key configured.</summary>
    public const string Configured = "configured";
    /// <summary>Provider is missing credentials (no env var, no inline key).</summary>
    public const string MissingCredentials = "missing-credentials";
    /// <summary>Provider is configured but health-check reported a failure.</summary>
    public const string Unhealthy = "unhealthy";
}
