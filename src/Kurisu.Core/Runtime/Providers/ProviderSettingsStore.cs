using System.Text.Json;
using System.Text.Json.Serialization;
using Kurisu.Core.Infrastructure;
using Microsoft.Extensions.Logging;

namespace Kurisu.Core.Runtime.Providers;

/// <summary>
/// Single provider's runtime configuration (api key + optional base URL
/// override). Stored in <see cref="ProviderSettingsStore"/>.
/// </summary>
public sealed record ProviderEntry(
    string ManifestId,
    string ApiKey,
    string? BaseUrl,
    DateTimeOffset ConfiguredAt)
{
    /// <summary>Effective base URL (override or null).</summary>
    public string? EffectiveBaseUrl =>
        string.IsNullOrWhiteSpace(BaseUrl) ? null : BaseUrl.Trim();
}

/// <summary>
/// Persists provider API keys and base URL overrides. Replaces the old
/// <c>modelProviders</c> section of <c>Settings.json</c> with a dedicated
/// store living in the runtime State directory. Reads + writes are atomic
/// (temp file + rename) to avoid leaving a partial file behind on crash.
/// </summary>
public sealed class ProviderSettingsStore : IDisposable
{
    private readonly ILogger<ProviderSettingsStore> _logger;
    private readonly object _gate = new();
    private readonly string _filePath;
    private readonly Dictionary<string, ProviderEntry> _entries = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>Raised when <see cref="Configure"/> or <see cref="Remove"/> mutates the store.</summary>
    public event EventHandler? Changed;

    /// <summary>
    /// Initialises the store, loading any persisted providers from
    /// <c>~/.kurisu/State/Providers.json</c>.
    /// </summary>
    /// <param name="environmentPaths">Environment paths used to locate the state directory.</param>
    /// <param name="logger">Logger for diagnostics.</param>
    public ProviderSettingsStore(IDesktopEnvironmentPaths environmentPaths, ILogger<ProviderSettingsStore> logger)
    {
        _logger = logger;
        _filePath = KurisuPaths.StateDirectory(environmentPaths.HomeDirectory) is { Length: > 0 } dir
            ? Path.Combine(dir, "Providers.json")
            : Path.Combine(KurisuPaths.GlobalKurisuDirectory(environmentPaths.HomeDirectory), "State", "Providers.json");
        LoadFromDisk();
    }

    /// <summary>Absolute path to the persisted providers file.</summary>
    public string FilePath => _filePath;

    /// <summary>Snapshot of currently configured providers.</summary>
    public IReadOnlyList<ProviderEntry> ConfiguredProviders
    {
        get
        {
            lock (_gate)
            {
                return _entries.Values.ToArray();
            }
        }
    }

    /// <summary>Whether the provider has an entry (api key + optional base URL).</summary>
    public bool IsConfigured(string providerId) => Get(providerId) is not null;

    /// <summary>Returns the entry for <paramref name="providerId"/> or null if not configured.</summary>
    public ProviderEntry? Get(string providerId)
    {
        lock (_gate)
        {
            return _entries.TryGetValue(providerId, out var entry) ? entry : null;
        }
    }

    /// <summary>
    /// Stores (or replaces) the api key + optional base URL override for the
    /// given provider id. Writes to disk atomically and raises <see cref="Changed"/>.
    /// </summary>
    public void Configure(string providerId, string apiKey, string? baseUrl = null)
    {
        if (string.IsNullOrWhiteSpace(providerId))
        {
            throw new ArgumentException("Provider id is required.", nameof(providerId));
        }
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new ArgumentException("API key is required.", nameof(apiKey));
        }

        lock (_gate)
        {
            _entries[providerId] = new ProviderEntry(
                ManifestId: providerId,
                ApiKey: apiKey.Trim(),
                BaseUrl: string.IsNullOrWhiteSpace(baseUrl) ? null : baseUrl.Trim(),
                ConfiguredAt: DateTimeOffset.UtcNow);
            PersistToDisk();
        }
        Changed?.Invoke(this, EventArgs.Empty);
    }

    /// <summary>Removes the entry for <paramref name="providerId"/>. No-op if not present.</summary>
    public bool Remove(string providerId)
    {
        bool removed;
        lock (_gate)
        {
            removed = _entries.Remove(providerId);
            if (removed)
            {
                PersistToDisk();
            }
        }
        if (removed)
        {
            Changed?.Invoke(this, EventArgs.Empty);
        }
        return removed;
    }

    /// <summary>
    /// Returns the API key for the provider, preferring the in-store entry and
    /// falling back to the first matching environment variable declared in the
    /// manifest. Returns null if neither is available.
    /// </summary>
    public string? ResolveApiKey(ProviderManifest manifest)
    {
        var entry = Get(manifest.Id);
        if (entry is not null && !string.IsNullOrWhiteSpace(entry.ApiKey))
        {
            return entry.ApiKey;
        }

        foreach (var envVar in manifest.ApiKeyEnvVars)
        {
            var value = Environment.GetEnvironmentVariable(envVar);
            if (!string.IsNullOrWhiteSpace(value))
            {
                return value;
            }
        }
        return null;
    }

    /// <summary>Resolves the effective base URL: manifest default → store override → null.</summary>
    public string? ResolveBaseUrl(ProviderManifest manifest)
    {
        var entry = Get(manifest.Id);
        return entry?.EffectiveBaseUrl ?? manifest.DefaultBaseUrl;
    }

    private void LoadFromDisk()
    {
        if (!File.Exists(_filePath))
        {
            return;
        }

        try
        {
            using var stream = File.OpenRead(_filePath);
            var dto = JsonSerializer.Deserialize<ProviderFile>(stream, JsonOpts);
            if (dto?.Entries is null) return;
            foreach (var entry in dto.Entries)
            {
                if (string.IsNullOrWhiteSpace(entry.ManifestId)) continue;
                _entries[entry.ManifestId] = new ProviderEntry(
                    ManifestId: entry.ManifestId,
                    ApiKey: entry.ApiKey ?? string.Empty,
                    BaseUrl: entry.BaseUrl,
                    ConfiguredAt: entry.ConfiguredAt ?? DateTimeOffset.UtcNow);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read provider settings file {Path}; starting empty.", _filePath);
        }
    }

    private void PersistToDisk()
    {
        try
        {
            var dir = Path.GetDirectoryName(_filePath);
            if (!string.IsNullOrEmpty(dir))
            {
                Directory.CreateDirectory(dir);
            }
            var dto = new ProviderFile
            {
                Entries = _entries.Values.Select(e => new ProviderFileEntry
                {
                    ManifestId = e.ManifestId,
                    ApiKey = e.ApiKey,
                    BaseUrl = e.BaseUrl,
                    ConfiguredAt = e.ConfiguredAt,
                }).ToArray()
            };
            var tmpPath = $"{_filePath}.tmp.{Guid.NewGuid():N}";
            var json = JsonSerializer.Serialize(dto, JsonOpts);
            Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
            File.WriteAllText(tmpPath, json);
            if (File.Exists(_filePath))
            {
                File.Replace(tmpPath, _filePath, null);
            }
            else
            {
                File.Move(tmpPath, _filePath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist provider settings to {Path}", _filePath);
        }
    }

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private sealed class ProviderFile
    {
        [JsonPropertyName("entries")]
        public ProviderFileEntry[]? Entries { get; set; }
    }

    private sealed class ProviderFileEntry
    {
        [JsonPropertyName("manifestId")]
        public string? ManifestId { get; set; }

        [JsonPropertyName("apiKey")]
        public string? ApiKey { get; set; }

        [JsonPropertyName("baseUrl")]
        public string? BaseUrl { get; set; }

        [JsonPropertyName("configuredAt")]
        public DateTimeOffset? ConfiguredAt { get; set; }
    }

    /// <summary>No persistent resources to release; state lives in memory + on disk.</summary>
    public void Dispose()
    {
        // No persistent resources to release; state lives in memory + on disk.
    }
}