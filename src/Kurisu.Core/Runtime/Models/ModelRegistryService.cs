using Kurisu.Core.Config;
using Kurisu.Core.Models;
using Kurisu.Core.Runtime.Providers;
using Microsoft.Extensions.Options;

namespace Kurisu.Core.Runtime;

/// <summary>
/// Resolves the list of models visible to the assistant runtime and which
/// one is currently selected. The default model and embedding model come
/// from <see cref="RuntimeSelectionStore"/>; the available model list comes
/// from <see cref="ProviderCatalog"/>.
/// </summary>
/// <param name="configService">Source of merged settings.</param>
/// <param name="selectionStore">Source of active model / embedding model / provider selection.</param>
/// <param name="tokenLimitService">Resolves context/output token limits per model.</param>
/// <param name="runtimeOptions">Runtime override options (endpoint, api key overrides).</param>
public sealed class ModelRegistryService(
    IConfigService configService,
    RuntimeSelectionStore selectionStore,
    ITokenLimitService tokenLimitService,
    IOptions<NativeAssistantRuntimeOptions> runtimeOptions) : IModelRegistry
{
    private readonly ITokenLimitService _tokenLimitService = tokenLimitService;
    private readonly NativeAssistantRuntimeOptions _runtimeOptions = runtimeOptions.Value;

    /// <summary>
    /// Inspects the configuration and returns the resolved model snapshot.
    /// </summary>
    /// <param name="paths">Workspace paths.</param>
    /// <returns>The resulting runtime model snapshot.</returns>
    public RuntimeModelSnapshot Inspect(WorkspacePaths paths)
    {
        _ = configService.Inspect(paths);
        var currentSelection = selectionStore.Current;
        var availableModels = BuildAvailableModels(currentSelection);

        return new RuntimeModelSnapshot
        {
            DefaultModelId = currentSelection.SelectedModelId,
            EmbeddingModelId = currentSelection.SelectedEmbeddingModelId,
            SelectedAuthType = currentSelection.SelectedAuthType,
            AvailableModels = availableModels
        };
    }

    private IReadOnlyList<AvailableModel> BuildAvailableModels(RuntimeSelection selection)
    {
        var models = new List<AvailableModel>();

        EnsureSyntheticModel(
            models,
            selection.SelectedModelId,
            selection.SelectedAuthType,
            isDefault: true,
            isEmbedding: false,
            _tokenLimitService,
            _runtimeOptions);
        EnsureSyntheticModel(
            models,
            selection.SelectedEmbeddingModelId,
            selection.SelectedAuthType,
            isDefault: false,
            isEmbedding: true,
            _tokenLimitService,
            _runtimeOptions);

        return models
            .OrderByDescending(static item => item.IsDefaultModel)
            .ThenByDescending(static item => item.IsEmbeddingModel)
            .ThenBy(static item => item.Id, StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static void EnsureSyntheticModel(
        ICollection<AvailableModel> models,
        string modelId,
        string authType,
        bool isDefault,
        bool isEmbedding,
        ITokenLimitService tokenLimitService,
        NativeAssistantRuntimeOptions runtimeOptions)
    {
        if (string.IsNullOrWhiteSpace(modelId))
        {
            return;
        }

        var existing = models.FirstOrDefault(item =>
            string.Equals(item.Id, modelId, StringComparison.OrdinalIgnoreCase));
        if (existing is not null)
        {
            return;
        }

        var limits = tokenLimitService.Resolve(modelId, runtimeOptions);
        models.Add(new AvailableModel
        {
            Id = modelId,
            AuthType = string.IsNullOrWhiteSpace(authType) ? "openai" : authType,
            BaseUrl = string.Empty,
            ApiKeyEnvironmentVariable = string.Empty,
            Source = isEmbedding ? "embedding-model" : "default-model",
            ContextWindowSize = limits.InputTokenLimit,
            MaxOutputTokens = limits.OutputTokenLimit,
            IsDefaultModel = isDefault,
            IsEmbeddingModel = isEmbedding,
            Capabilities = InferCapabilities(modelId, isEmbedding)
        });
    }

    private static RuntimeModelCapabilities InferCapabilities(string modelId, bool embedding)
    {
        if (embedding || modelId.Contains("embedding", StringComparison.OrdinalIgnoreCase))
        {
            return new RuntimeModelCapabilities
            {
                SupportsEmbeddings = true,
                SupportsJsonOutput = false,
                SupportsStreaming = false,
                SupportsToolCalls = false,
                SupportsReasoning = false
            };
        }

        return new RuntimeModelCapabilities
        {
            SupportsEmbeddings = false,
            SupportsJsonOutput = true,
            SupportsStreaming = true,
            SupportsToolCalls = true,
            SupportsReasoning = modelId.Contains("kurisu", StringComparison.OrdinalIgnoreCase) ||
                                modelId.Contains("reason", StringComparison.OrdinalIgnoreCase)
        };
    }
}