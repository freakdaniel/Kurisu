namespace Kurisu.Core.Runtime.Providers;

/// <summary>
/// Static catalog of built-in OpenAI-Compatible provider manifests. The list
/// mirrors the previous <c>ProviderPresetCatalog</c> but is data-driven and
/// shares the richer <see cref="ProviderManifest"/> schema. User overrides
/// are layered on top by <see cref="ProviderSettingsStore"/> at runtime.
/// </summary>
public static class ProviderCatalog
{
    private const string AnthropicFallbackModelList =
        "[\"claude-3-5-sonnet-latest\",\"claude-3-7-sonnet-latest\",\"claude-sonnet-4\",\"claude-opus-4\"]";

    /// <summary>All built-in manifests, sorted by descending popularity.</summary>
    public static IReadOnlyList<ProviderManifest> Builtins { get; } = Build();

    /// <summary>
    /// Resolves a built-in manifest by id (case-insensitive).
    /// </summary>
    public static ProviderManifest? FindById(string id) =>
        Builtins.FirstOrDefault(manifest =>
            string.Equals(manifest.Id, id, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyList<ProviderManifest> Build() =>
    [
new ProviderManifest(
            Id: "openai",
            Name: "OpenAI",
            Description: "GPT-4o, GPT-5, o-series and other OpenAI models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.openai.com/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["OPENAI_API_KEY"],
            Capabilities: ["tools", "json"],
            ModelsSourceUrl: "https://api.openai.com/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://platform.openai.com/docs/models",
            Popularity: 100),
        new ProviderManifest(
            Id: "anthropic",
            Name: "Anthropic",
            Description: "Claude 3.5/3.7/4 models served via OpenAI-Compatible endpoint.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.anthropic.com/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["ANTHROPIC_API_KEY"],
            Capabilities: ["tools", "reasoning"],
            ModelsSourceUrl: null,
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
            Popularity: 95),
        new ProviderManifest(
            Id: "openrouter",
            Name: "OpenRouter",
            Description: "Aggregator for many providers (Anthropic, OpenAI, Google, Meta, etc.).",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://openrouter.ai/api/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["OPENROUTER_API_KEY"],
            Capabilities: ["tools", "reasoning", "prompt-cache"],
            ModelsSourceUrl: "https://openrouter.ai/api/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://openrouter.ai/models",
            Popularity: 90),
        new ProviderManifest(
            Id: "deepseek",
            Name: "DeepSeek",
            Description: "DeepSeek-V3, R1, Coder models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.deepseek.com/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["DEEPSEEK_API_KEY"],
            Capabilities: ["tools", "reasoning"],
            ModelsSourceUrl: "https://api.deepseek.com/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://api-docs.deepseek.com/",
            Popularity: 80),
        new ProviderManifest(
            Id: "xai",
            Name: "xAI (Grok)",
            Description: "Grok 2/3/4 models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.x.ai/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["XAI_API_KEY"],
            Capabilities: ["tools", "reasoning"],
            ModelsSourceUrl: "https://api.x.ai/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://docs.x.ai/docs/models",
            Popularity: 70),
        new ProviderManifest(
            Id: "groq",
            Name: "Groq",
            Description: "Ultra-fast LPU inference for open-source models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.groq.com/openai/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["GROQ_API_KEY"],
            Capabilities: ["tools"],
            ModelsSourceUrl: "https://api.groq.com/openai/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://console.groq.com/docs/models",
            Popularity: 65),
        new ProviderManifest(
            Id: "zai",
            Name: "Z.AI (GLM)",
            Description: "GLM-4.5/4.6/4.7 family.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.z.ai/api/paas/v4",
            DefaultModelId: null,
            ApiKeyEnvVars: ["ZHIPU_API_KEY"],
            Capabilities: ["tools", "reasoning"],
            ModelsSourceUrl: "https://api.z.ai/api/paas/v4/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://docs.z.ai/guides/overview/quick-start",
            Popularity: 60),
        new ProviderManifest(
            Id: "mistral",
            Name: "Mistral",
            Description: "Mistral Large, Codestral and other Mistral models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.mistral.ai/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["MISTRAL_API_KEY"],
            Capabilities: ["tools"],
            ModelsSourceUrl: "https://api.mistral.ai/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://docs.mistral.ai/getting-started/models/models_overview/",
            Popularity: 55),
        new ProviderManifest(
            Id: "together",
            Name: "Together AI",
            Description: "Fast inference for open-source models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.together.xyz/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["TOGETHER_API_KEY"],
            Capabilities: ["tools"],
            ModelsSourceUrl: "https://api.together.xyz/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://docs.together.ai/docs/models-inference",
            Popularity: 50),
        new ProviderManifest(
            Id: "moonshot",
            Name: "Moonshot (Kimi)",
            Description: "Moonshot v1 / Kimi models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.moonshot.cn/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["MOONSHOT_API_KEY"],
            Capabilities: ["tools"],
            ModelsSourceUrl: "https://api.moonshot.cn/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://platform.moonshot.cn/docs/intro",
            Popularity: 45),
        new ProviderManifest(
            Id: "fireworks",
            Name: "Fireworks AI",
            Description: "High-performance inference for open-source models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.fireworks.ai/inference/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["FIREWORKS_API_KEY"],
            Capabilities: ["tools"],
            ModelsSourceUrl: "https://api.fireworks.ai/inference/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://docs.fireworks.ai/models",
            Popularity: 45),
        new ProviderManifest(
            Id: "huggingface",
            Name: "Hugging Face",
            Description: "Hugging Face Inference API router.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://router.huggingface.co/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["HF_TOKEN"],
            Capabilities: ["tools"],
            ModelsSourceUrl: "https://router.huggingface.co/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://huggingface.co/docs/inference-endpoints",
            Popularity: 40),
        new ProviderManifest(
            Id: "vercel",
            Name: "Vercel AI Gateway",
            Description: "Vercel's AI gateway service.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://ai-gateway.vercel.sh/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["AI_GATEWAY_API_KEY"],
            Capabilities: ["tools", "reasoning", "prompt-cache"],
            ModelsSourceUrl: "https://ai-gateway.vercel.sh/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://vercel.com/docs/ai-gateway",
            Popularity: 35),
        new ProviderManifest(
            Id: "litellm",
            Name: "LiteLLM (self-host)",
            Description: "Self-hosted LiteLLM proxy (default http://localhost:4000).",
            Family: "openai-compatible",
            DefaultBaseUrl: "http://localhost:4000/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["LITELLM_API_KEY"],
            Capabilities: ["tools", "prompt-cache"],
            ModelsSourceUrl: "http://localhost:4000/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://docs.litellm.ai/",
            Popularity: 30),
        new ProviderManifest(
            Id: "requesty",
            Name: "Requesty",
            Description: "AI router with multiple provider support.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://router.requesty.ai/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["REQUESTY_API_KEY"],
            Capabilities: ["tools", "reasoning"],
            ModelsSourceUrl: "https://router.requesty.ai/v1/models",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://requesty.ai/solution/llm-routing",
            Popularity: 25),
        new ProviderManifest(
            Id: "ollama",
            Name: "Ollama (local)",
            Description: "Local Ollama daemon (default http://localhost:11434).",
            Family: "openai-compatible",
            DefaultBaseUrl: "http://localhost:11434/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["OLLAMA_API_KEY"],
            Capabilities: ["tools"],
            ModelsSourceUrl: "http://localhost:11434/api/tags",
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: "https://github.com/ollama/ollama/blob/main/docs/openai.md",
            Popularity: 70),
        new ProviderManifest(
            Id: "custom",
            Name: "Custom (manual)",
            Description: "Enter your own base URL, model, and API key.",
            Family: "openai-compatible",
            DefaultBaseUrl: null,
            DefaultModelId: null,
            ApiKeyEnvVars: [],
            Capabilities: [],
            ModelsSourceUrl: null,
            KnownModels: null,
            ModelsSourceHeaders: null,
            DocsUrl: null,
            Popularity: 0)
    ];

    /// <summary>
    /// Returns the effective manifest list: built-ins plus any user-defined
    /// custom providers from <see cref="ProviderSettingsStore"/>.
    /// </summary>
    public static IReadOnlyList<ProviderManifest> Effective(IEnumerable<ProviderEntry>? customEntries)
    {
        if (customEntries is null)
        {
            return Builtins;
        }

        var byId = Builtins.ToDictionary(p => p.Id, StringComparer.OrdinalIgnoreCase);
        var effective = new List<ProviderManifest>(Builtins);
        foreach (var entry in customEntries)
        {
            if (byId.ContainsKey(entry.ManifestId))
            {
                continue;
            }
            effective.Add(new ProviderManifest(
                Id: entry.ManifestId,
                Name: entry.ManifestId,
                Description: "User-defined custom provider.",
                Family: "openai-compatible",
                DefaultBaseUrl: entry.BaseUrl ?? string.Empty,
                DefaultModelId: null,
                ApiKeyEnvVars: [],
                Capabilities: [],
                ModelsSourceUrl: null,
                KnownModels: null,
                ModelsSourceHeaders: null,
                DocsUrl: null,
                Popularity: -1));
        }
        return effective;
    }
}