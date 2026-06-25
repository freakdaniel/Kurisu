using System.Text.Json;
using System.Text.Json.Serialization;
using Kurisu.Core.Infrastructure;
using Microsoft.Extensions.Logging;

namespace Kurisu.Core.Config;

/// <summary>
/// Runtime state that is NOT a user preference: which auth type is active,
/// which model id is currently selected, which embedding model id is used.
/// Persisted to <c>~/.kurisu/State/Selection.json</c> (atomic write) so the
/// choice survives across restarts but stays separate from the user-visible
/// <c>Settings.json</c>.
/// </summary>
public sealed record RuntimeSelection(
    string SelectedAuthType,
    string SelectedModelId,
    string SelectedEmbeddingModelId)
{
    /// <summary>Default selection used when no <c>Selection.json</c> exists yet.</summary>
    public static RuntimeSelection Default { get; } = new(
        SelectedAuthType: "openai",
        SelectedModelId: "coder-model",
        SelectedEmbeddingModelId: "text-embedding-v4");
}

/// <summary>
/// Singleton store for the runtime selection. The current value is exposed
/// via <see cref="Current"/>; mutations are written atomically to disk and
/// raise <see cref="Changed"/>.
/// </summary>
public sealed class RuntimeSelectionStore
{
    private readonly ILogger<RuntimeSelectionStore> _logger;
    private readonly object _gate = new();
    private readonly string _filePath;
    private RuntimeSelection _current;

    /// <summary>Raised when the selection changes via any mutator.</summary>
    public event EventHandler? Changed;

    /// <summary>
    /// Initialises the store, loading any persisted selection from
    /// <c>~/.kurisu/State/Selection.json</c>.
    /// </summary>
    /// <param name="environmentPaths">Environment paths used to locate the state directory.</param>
    /// <param name="logger">Logger for diagnostics.</param>
    public RuntimeSelectionStore(IDesktopEnvironmentPaths environmentPaths, ILogger<RuntimeSelectionStore> logger)
    {
        _logger = logger;
        _filePath = KurisuPaths.SelectionFile(environmentPaths.HomeDirectory);
        _current = LoadFromDisk();
    }

    /// <summary>Absolute path to the persisted selection file.</summary>
    public string FilePath => _filePath;

    /// <summary>Current selection snapshot.</summary>
    public RuntimeSelection Current
    {
        get
        {
            lock (_gate)
            {
                return _current;
            }
        }
    }

    /// <summary>Updates the selected auth type (e.g. <c>openai</c>, <c>anthropic</c>).</summary>
    /// <param name="authType">New auth type id.</param>
    public void UpdateAuthType(string authType)
    {
        lock (_gate)
        {
            _current = _current with { SelectedAuthType = string.IsNullOrWhiteSpace(authType) ? "openai" : authType.Trim() };
            PersistToDisk();
        }
        Changed?.Invoke(this, EventArgs.Empty);
    }

    /// <summary>Updates the selected chat model id.</summary>
    /// <param name="modelId">Model id.</param>
    public void UpdateModel(string modelId)
    {
        lock (_gate)
        {
            _current = _current with { SelectedModelId = (modelId ?? string.Empty).Trim() };
            PersistToDisk();
        }
        Changed?.Invoke(this, EventArgs.Empty);
    }

    /// <summary>Updates the selected embedding model id.</summary>
    /// <param name="modelId">Embedding model id.</param>
    public void UpdateEmbeddingModel(string modelId)
    {
        lock (_gate)
        {
            _current = _current with { SelectedEmbeddingModelId = (modelId ?? string.Empty).Trim() };
            PersistToDisk();
        }
        Changed?.Invoke(this, EventArgs.Empty);
    }

    private RuntimeSelection LoadFromDisk()
    {
        if (!File.Exists(_filePath))
        {
            return RuntimeSelection.Default;
        }
        try
        {
            using var stream = File.OpenRead(_filePath);
            var dto = JsonSerializer.Deserialize<SelectionFile>(stream, JsonOpts);
            if (dto is null)
            {
                return RuntimeSelection.Default;
            }
            return new RuntimeSelection(
                SelectedAuthType: string.IsNullOrWhiteSpace(dto.SelectedAuthType) ? "openai" : dto.SelectedAuthType,
                SelectedModelId: dto.SelectedModelId ?? string.Empty,
                SelectedEmbeddingModelId: dto.SelectedEmbeddingModelId ?? string.Empty);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read selection file {Path}; using defaults.", _filePath);
            return RuntimeSelection.Default;
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
            var dto = new SelectionFile
            {
                SelectedAuthType = _current.SelectedAuthType,
                SelectedModelId = _current.SelectedModelId,
                SelectedEmbeddingModelId = _current.SelectedEmbeddingModelId,
            };
            var tmpPath = $"{_filePath}.tmp.{Guid.NewGuid():N}";
            Directory.CreateDirectory(Path.GetDirectoryName(_filePath)!);
            File.WriteAllText(tmpPath, JsonSerializer.Serialize(dto, JsonOpts));
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
            _logger.LogError(ex, "Failed to persist selection to {Path}", _filePath);
        }
    }

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private sealed class SelectionFile
    {
        [JsonPropertyName("selectedAuthType")]
        public string? SelectedAuthType { get; set; }

        [JsonPropertyName("selectedModelId")]
        public string? SelectedModelId { get; set; }

        [JsonPropertyName("selectedEmbeddingModelId")]
        public string? SelectedEmbeddingModelId { get; set; }
    }
}