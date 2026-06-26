namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Web-search provider type tags. Wire format is preserved as
/// <c>string</c> for IPC and Settings.json compatibility.
/// </summary>
public static class WebSearchProviderKind
{
    /// <summary>Tavily AI search API.</summary>
    public const string Tavily = "tavily";
    /// <summary>Google Custom Search API (Programmable Search Engine).</summary>
    public const string Google = "google";
}
