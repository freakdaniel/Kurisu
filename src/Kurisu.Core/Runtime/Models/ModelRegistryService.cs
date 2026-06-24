using Kurisu.Core.Config;
using Kurisu.Core.Models;
using Microsoft.Extensions.Options;

namespace Kurisu.Core.Runtime;

/// <summary>
/// Resolves the list of models visible to the assistant runtime and which
/// one is currently selected. Reads everything from
/// <see cref="RuntimeConfigSnapshot"/>: model metadata from the legacy
/// <c>modelProviders</c> section of Settings.json (still preserved for
/// compatibility), and the currently selected model + embedding model from
/// <c>model.name</c> + <c>embeddingModel</c>.
/// </summary>
/// <param name="configService">Source of merged settings (paths, telemetry, model list, selection).</param>
/// <param name="tokenLimitService">Resolves context/output token limits per model.</param>
/// <param name="runtimeOptions">Runtime override options (endpoint, api key overrides).</param>
public sealed class ModelRegistryService(
    IConfigService configService,
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
        var snapshot = configService.Inspect(paths);
        var availableModels = BuildAvailableModels(snapshot);

        return new RuntimeModelSnapshot
        {
            DefaultModelId = snapshot.ModelName,
            EmbeddingModelId = snapshot.EmbeddingModel,
            SelectedAuthType = snapshot.SelectedAuthType,
            AvailableModels = availableModels
        };
    }

    private IReadOnlyList<AvailableModel> BuildAvailableModels(RuntimeConfigSnapshot snapshot)
    {
        return BuildAvailableModels(snapshot, _tokenLimitService, _runtimeOptions);
    }

    private static IReadOnlyList<AvailableModel> BuildAvailableModels(
        RuntimeConfigSnapshot snapshot,
        ITokenLimitService tokenLimitService,
        NativeAssistantRuntimeOptions runtimeOptions)
    {
        var models = new List<AvailableModel>();
        foreach (var provider in snapshot.ModelProviders)
        {
            var limits = tokenLimitService.Resolve(provider.Id, runtimeOptions);
            var contextWindowSize = provider.ContextWindowSize.GetValueOrDefault(limits.InputTokenLimit);
            var maxOutputTokens = provider.MaxOutputTokens.GetValueOrDefault(limits.OutputTokenLimit);
            models.Add(new AvailableModel
            {
                Id = provider.Id,
                AuthType = string.IsNullOrWhiteSpace(provider.AuthType) ? snapshot.SelectedAuthType : provider.AuthType,
                BaseUrl = provider.BaseUrl,
                ApiKeyEnvironmentVariable = provider.EnvironmentVariableName,
                Source = "model-provider",
                ContextWindowSize = contextWindowSize,
                MaxOutputTokens = maxOutputTokens,
                IsDefaultModel = string.Equals(provider.Id, snapshot.ModelName, StringComparison.OrdinalIgnoreCase),
                IsEmbeddingModel = string.Equals(provider.Id, snapshot.EmbeddingModel, StringComparison.OrdinalIgnoreCase),
                Capabilities = InferCapabilities(provider.Id, embedding: string.Equals(provider.Id, snapshot.EmbeddingModel, StringComparison.OrdinalIgnoreCase))
            });
        }

        EnsureSyntheticModel(models, snapshot.ModelName, snapshot.SelectedAuthType, isDefault: true, isEmbedding: false, tokenLimitService, runtimeOptions);
        EnsureSyntheticModel(models, snapshot.EmbeddingModel, snapshot.SelectedAuthType, isDefault: false, isEmbedding: true, tokenLimitService, runtimeOptions);

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
            string.Equals(item.Id, modelId, StringComparison.OrdinalIgnoreCase) &&
            string.Equals(item.AuthType, authType, StringComparison.OrdinalIgnoreCase));
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