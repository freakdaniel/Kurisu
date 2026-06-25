using Kurisu.Core.Config;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Models;
using Kurisu.Core.Runtime.Providers;
using Microsoft.Extensions.Logging;

namespace Kurisu.App.Desktop.Bridges;

/// <summary>
/// Multi-provider service: lists all configured providers, configures a new
/// provider, removes a configured provider. Replaces the legacy
/// <c>IAuthBridge</c> single-auth surface.
/// </summary>
public sealed class ProviderListService : IDisposable
{
    private readonly ProviderSettingsStore providerSettings;
    private readonly RuntimeSelectionStore selection;
    private readonly IDesktopEnvironmentPaths environmentPaths;
    private readonly ILogger<ProviderListService> _logger;

    /// <summary>Raises when the configured-provider list changes.</summary>
    public event EventHandler<ProviderListSnapshot>? ProvidersChanged;

    /// <summary>
    /// Initialises the service with its multi-provider collaborators.
    /// </summary>
    public ProviderListService(
        ProviderSettingsStore providerSettings,
        RuntimeSelectionStore selection,
        IDesktopEnvironmentPaths environmentPaths,
        ILogger<ProviderListService>? logger = null)
    {
        this.providerSettings = providerSettings;
        this.selection = selection;
        this.environmentPaths = environmentPaths;
        _logger = logger ?? Microsoft.Extensions.Logging.Abstractions.NullLogger<ProviderListService>.Instance;
        providerSettings.Changed += OnProviderSettingsChanged;
        selection.Changed += OnProviderSettingsChanged;
    }

    /// <summary>Returns the current multi-provider state.</summary>
    public ProviderListSnapshot CreateSnapshot()
    {
        var activeProviderId = selection.Current.SelectedAuthType;
        var configured = providerSettings.ConfiguredProviders;
        var allBuiltins = ProviderCatalog.Builtins;

        // Build list: configured + builtin (so the UI can show all available)
        var statuses = new List<ProviderStatusSnapshot>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Configured first
        foreach (var entry in configured)
        {
            var manifest = allBuiltins.FirstOrDefault(m => string.Equals(m.Id, entry.ManifestId, StringComparison.OrdinalIgnoreCase));
            statuses.Add(BuildStatus(manifest, entry));
            seen.Add(entry.ManifestId);
        }

        // Remaining builtins (not configured)
        foreach (var manifest in allBuiltins)
        {
            if (seen.Contains(manifest.Id)) continue;
            statuses.Add(BuildStatus(manifest, null));
        }

        return new ProviderListSnapshot
        {
            ActiveProviderId = activeProviderId,
            Providers = statuses,
        };
    }

    /// <summary>Stores the api key (and optional base URL) for the given provider.</summary>
    public Task<ProviderListSnapshot> ConfigureAsync(ConfigureProviderRequest request)
    {
        var manifest = ProviderCatalog.FindById(request.ProviderId);
        if (manifest is null)
        {
            throw new InvalidOperationException($"Unknown provider '{request.ProviderId}'");
        }
        providerSettings.Configure(request.ProviderId, request.ApiKey, request.BaseUrl);
        return Task.FromResult(CreateSnapshot());
    }

    /// <summary>Removes the stored api key + base URL for the given provider.</summary>
    public Task<ProviderListSnapshot> DeconfigureAsync(DeconfigureProviderRequest request)
    {
        providerSettings.Remove(request.ProviderId);
        return Task.FromResult(CreateSnapshot());
    }

    private void OnProviderSettingsChanged(object? sender, EventArgs e) =>
        ProvidersChanged?.Invoke(this, CreateSnapshot());

    private static ProviderStatusSnapshot BuildStatus(ProviderManifest? manifest, ProviderEntry? entry)
    {
        if (manifest is null)
        {
            return new ProviderStatusSnapshot
            {
                ProviderId = entry?.ManifestId ?? string.Empty,
                DisplayName = entry?.ManifestId ?? string.Empty,
                BaseUrl = string.Empty,
                ApiKeyEnvironmentVariable = string.Empty,
                HasApiKey = false,
                Status = "missing-credentials",
                LastError = "Provider not in built-in catalog",
            };
        }

        var apiKey = entry is not null && !string.IsNullOrWhiteSpace(entry.ApiKey)
            ? entry.ApiKey
            : manifest.ApiKeyEnvVars
                .Select(Environment.GetEnvironmentVariable)
                .FirstOrDefault(value => !string.IsNullOrWhiteSpace(value)) ?? string.Empty;
        var hasKey = !string.IsNullOrWhiteSpace(apiKey);
        var baseUrl = entry?.EffectiveBaseUrl ?? manifest.DefaultBaseUrl ?? string.Empty;
        return new ProviderStatusSnapshot
        {
            ProviderId = manifest.Id,
            DisplayName = manifest.Name,
            BaseUrl = baseUrl,
            ApiKeyEnvironmentVariable = manifest.ApiKeyEnvVars.FirstOrDefault() ?? "OPENAI_API_KEY",
            HasApiKey = hasKey,
            Status = hasKey ? "configured" : "missing-credentials",
            LastError = hasKey
                ? string.Empty
                : $"Set {manifest.ApiKeyEnvVars.FirstOrDefault() ?? "OPENAI_API_KEY"} or configure an inline API key.",
        };
    }

    /// <summary>Unsubscribes from upstream change events.</summary>
    public void Dispose()
    {
        providerSettings.Changed -= OnProviderSettingsChanged;
        selection.Changed -= OnProviderSettingsChanged;
    }
}