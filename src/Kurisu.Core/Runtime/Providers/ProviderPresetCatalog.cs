using Kurisu.Core.Models;

namespace Kurisu.Core.Runtime.Providers;

/// <summary>
/// Static catalog of built-in OpenAI-Compatible provider presets.
/// </summary>
public static class ProviderPresetCatalog
{
    private const string AnthropicFallbackModelList =
        "[\"claude-3-5-sonnet-latest\",\"claude-3-7-sonnet-latest\",\"claude-sonnet-4\",\"claude-opus-4\"]";

    /// <summary>
    /// All presets, sorted by descending popularity.
    /// </summary>
    public static IReadOnlyList<ProviderPreset> Presets { get; } = Build();

    /// <summary>
    /// Resolves a preset by id (case-insensitive).
    /// </summary>
    public static ProviderPreset? FindById(string id) =>
        Presets.FirstOrDefault(preset =>
            string.Equals(preset.Id, id, StringComparison.OrdinalIgnoreCase));

    private static IReadOnlyList<ProviderPreset> Build() =>
    [
        new ProviderPreset(
            Id: "openai",
            Name: "OpenAI",
            Description: "GPT-4o, GPT-5, o-series and other OpenAI models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.openai.com/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["OPENAI_API_KEY"],
            Capabilities: ["tools", "json"],
            Popularity: 100,
            DocsUrl: "https://platform.openai.com/docs/models",
            ModelsSourceUrl: "https://api.openai.com/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "anthropic",
            Name: "Anthropic (compat)",
            Description: "Claude 3.5/3.7/4 models served via OpenAI-Compatible endpoint.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.anthropic.com/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["ANTHROPIC_API_KEY"],
            Capabilities: ["tools", "reasoning"],
            Popularity: 95,
            DocsUrl: "https://docs.anthropic.com/en/docs/about-claude/models",
            ModelsSourceUrl: null,  // Anthropic's OpenAI-compat does not expose /models — fall back to hardcoded list.
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "openrouter",
            Name: "OpenRouter",
            Description: "Aggregator for many providers (Anthropic, OpenAI, Google, Meta, etc.).",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://openrouter.ai/api/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["OPENROUTER_API_KEY"],
            Capabilities: ["tools", "reasoning", "prompt-cache"],
            Popularity: 90,
            DocsUrl: "https://openrouter.ai/models",
            ModelsSourceUrl: "https://openrouter.ai/api/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "deepseek",
            Name: "DeepSeek",
            Description: "DeepSeek-V3, R1, Coder models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.deepseek.com/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["DEEPSEEK_API_KEY"],
            Capabilities: ["tools", "reasoning"],
            Popularity: 80,
            DocsUrl: "https://api-docs.deepseek.com/",
            ModelsSourceUrl: "https://api.deepseek.com/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "xai",
            Name: "xAI (Grok)",
            Description: "Grok 2/3/4 models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.x.ai/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["XAI_API_KEY"],
            Capabilities: ["tools", "reasoning"],
            Popularity: 70,
            DocsUrl: "https://docs.x.ai/docs/models",
            ModelsSourceUrl: "https://api.x.ai/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "groq",
            Name: "Groq",
            Description: "Ultra-fast LPU inference for open-source models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.groq.com/openai/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["GROQ_API_KEY"],
            Capabilities: ["tools"],
            Popularity: 65,
            DocsUrl: "https://console.groq.com/docs/models",
            ModelsSourceUrl: "https://api.groq.com/openai/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "zai",
            Name: "Z.AI (GLM)",
            Description: "GLM-4.5/4.6/4.7 family.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.z.ai/api/paas/v4",
            DefaultModelId: null,
            ApiKeyEnvVars: ["ZHIPU_API_KEY"],
            Capabilities: ["tools", "reasoning"],
            Popularity: 60,
            DocsUrl: "https://docs.z.ai/guides/overview/quick-start",
            ModelsSourceUrl: "https://api.z.ai/api/paas/v4/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "mistral",
            Name: "Mistral",
            Description: "Mistral Large, Codestral and other Mistral models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.mistral.ai/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["MISTRAL_API_KEY"],
            Capabilities: ["tools"],
            Popularity: 55,
            DocsUrl: "https://docs.mistral.ai/getting-started/models/models_overview/",
            ModelsSourceUrl: "https://api.mistral.ai/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "together",
            Name: "Together AI",
            Description: "Fast inference for open-source models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.together.xyz/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["TOGETHER_API_KEY"],
            Capabilities: ["tools"],
            Popularity: 50,
            DocsUrl: "https://docs.together.ai/docs/models-inference",
            ModelsSourceUrl: "https://api.together.xyz/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "moonshot",
            Name: "Moonshot (Kimi)",
            Description: "Moonshot v1 / Kimi models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.moonshot.cn/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["MOONSHOT_API_KEY"],
            Capabilities: ["tools"],
            Popularity: 45,
            DocsUrl: "https://platform.moonshot.cn/docs/intro",
            ModelsSourceUrl: "https://api.moonshot.cn/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "fireworks",
            Name: "Fireworks AI",
            Description: "High-performance inference for open-source models.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://api.fireworks.ai/inference/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["FIREWORKS_API_KEY"],
            Capabilities: ["tools"],
            Popularity: 45,
            DocsUrl: "https://docs.fireworks.ai/models",
            ModelsSourceUrl: "https://api.fireworks.ai/inference/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "huggingface",
            Name: "Hugging Face",
            Description: "Hugging Face Inference API router.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://router.huggingface.co/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["HF_TOKEN"],
            Capabilities: ["tools"],
            Popularity: 40,
            DocsUrl: "https://huggingface.co/docs/inference-endpoints",
            ModelsSourceUrl: "https://router.huggingface.co/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "vercel",
            Name: "Vercel AI Gateway",
            Description: "Vercel's AI gateway service.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://ai-gateway.vercel.sh/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["AI_GATEWAY_API_KEY"],
            Capabilities: ["tools", "reasoning", "prompt-cache"],
            Popularity: 35,
            DocsUrl: "https://vercel.com/docs/ai-gateway",
            ModelsSourceUrl: "https://ai-gateway.vercel.sh/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "litellm",
            Name: "LiteLLM (self-host)",
            Description: "Self-hosted LiteLLM proxy (default http://localhost:4000).",
            Family: "openai-compatible",
            DefaultBaseUrl: "http://localhost:4000/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["LITELLM_API_KEY"],
            Capabilities: ["tools", "prompt-cache"],
            Popularity: 30,
            DocsUrl: "https://docs.litellm.ai/",
            ModelsSourceUrl: "http://localhost:4000/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "requesty",
            Name: "Requesty",
            Description: "AI router with multiple provider support.",
            Family: "openai-compatible",
            DefaultBaseUrl: "https://router.requesty.ai/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["REQUESTY_API_KEY"],
            Capabilities: ["tools", "reasoning"],
            Popularity: 25,
            DocsUrl: "https://requesty.ai/solution/llm-routing",
            ModelsSourceUrl: "https://router.requesty.ai/v1/models",
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "ollama",
            Name: "Ollama (local)",
            Description: "Local Ollama daemon (default http://localhost:11434).",
            Family: "openai-compatible",
            DefaultBaseUrl: "http://localhost:11434/v1",
            DefaultModelId: null,
            ApiKeyEnvVars: ["OLLAMA_API_KEY"],
            Capabilities: ["tools"],
            Popularity: 70,
            DocsUrl: "https://github.com/ollama/ollama/blob/main/docs/openai.md",
            ModelsSourceUrl: "http://localhost:11434/api/tags",  // Ollama uses /api/tags (non-standard)
            ModelsSourceHeaders: null),

        new ProviderPreset(
            Id: "custom",
            Name: "Custom (manual)",
            Description: "Enter your own base URL, model, and API key.",
            Family: "openai-compatible",
            DefaultBaseUrl: null,
            DefaultModelId: null,
            ApiKeyEnvVars: [],
            Capabilities: [],
            Popularity: 0,
            DocsUrl: null,
            ModelsSourceUrl: null,
            ModelsSourceHeaders: null)
    ];
}
