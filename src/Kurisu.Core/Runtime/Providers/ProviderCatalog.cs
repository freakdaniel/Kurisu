namespace Kurisu.Core.Runtime.Providers;

/// <summary>
/// Static catalog of built-in OpenAI-Compatible provider manifests. The list
/// includes all providers from the previous <c>ProviderPresetCatalog</c>
/// (still data-driven and shares the <see cref="ProviderManifest"/>
/// schema) plus additional OpenAI-compatible vendors so users can configure
/// any provider they have an API key for without writing custom code.
/// User overrides are layered on top by <see cref="ProviderSettingsStore"/>.
/// </summary>
public static class ProviderCatalog
{
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
        // First-party
        new("anthropic", "Anthropic", "Claude 3.5/3.7/4 models served via OpenAI-Compatible endpoint.",
            "openai-compatible", "https://api.anthropic.com/v1", null,
            ["ANTHROPIC_API_KEY"], ["tools", "reasoning"], null, null, null,
            "https://docs.anthropic.com/en/docs/about-claude/models", 100),
        new("claude-code", "Claude Code (CLI)", "Anthropic Claude Code CLI subscription.",
            "anthropic-cli", null, null, ["CLAUDE_CODE_API_KEY"], ["tools", "reasoning"], null, null, null,
            "https://docs.anthropic.com/en/docs/claude-code", 95),
        new("openai", "OpenAI", "GPT-4o, GPT-5, o-series and other OpenAI models.",
            "openai-compatible", "https://api.openai.com/v1", null,
            ["OPENAI_API_KEY"], ["tools", "json"], "https://api.openai.com/v1/models", null, null,
            "https://platform.openai.com/docs/models", 100),
        new("openai-native", "OpenAI (Native)", "OpenAI native Responses API endpoint.",
            "openai-native", "https://api.openai.com/v1", null,
            ["OPENAI_API_KEY"], ["tools", "json"], "https://api.openai.com/v1/models", null, null,
            "https://platform.openai.com/docs/api-reference/responses", 95),
        new("openai-codex", "OpenAI Codex", "OpenAI Codex (codex-1, gpt-5-codex).",
            "openai-codex", "https://api.openai.com/v1", "codex-1",
            ["OPENAI_API_KEY"], ["tools", "codex"], null, null, null,
            "https://platform.openai.com/docs/codex", 80),

        // Cloud providers
        new("bedrock", "AWS Bedrock", "Amazon Bedrock — Anthropic, Mistral, Meta, Cohere, AI21, etc. via AWS.",
            "bedrock", null, null, ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"], ["tools", "aws"],
            null, null, null, "https://aws.amazon.com/bedrock/", 70),
        new("vertex", "Google Vertex AI", "Vertex AI — Gemini, Anthropic, Llama, etc.",
            "vertex", null, null, ["GOOGLE_APPLICATION_CREDENTIALS"], ["tools", "google"],
            null, null, null, "https://cloud.google.com/vertex-ai", 65),
        new("gemini", "Google Gemini", "Google Gemini API direct.",
            "gemini", "https://generativelanguage.googleapis.com/v1beta", null,
            ["GEMINI_API_KEY", "GOOGLE_API_KEY"], ["tools", "vision"],
            "https://generativelanguage.googleapis.com/v1beta/models", null, null,
            "https://ai.google.dev/gemini-api/docs", 80),

        // Local
        new("ollama", "Ollama (local)", "Local Ollama daemon (default http://localhost:11434).",
            "openai-compatible", "http://localhost:11434/v1", null,
            ["OLLAMA_API_KEY"], ["tools"], "http://localhost:11434/api/tags", null, null,
            "https://github.com/ollama/ollama/blob/main/docs/openai.md", 70),
        new("lmstudio", "LM Studio (local)", "LM Studio local server (default http://localhost:1234).",
            "openai-compatible", "http://localhost:1234/v1", null,
            [], ["tools"], "http://localhost:1234/v1/models", null, null,
            "https://lmstudio.ai/docs", 50),

        // Major OpenAI-compatible providers
        new("openrouter", "OpenRouter", "Aggregator for many providers (Anthropic, OpenAI, Google, Meta, etc.).",
            "openai-compatible", "https://openrouter.ai/api/v1", null,
            ["OPENROUTER_API_KEY"], ["tools", "reasoning", "prompt-cache"],
            "https://openrouter.ai/api/v1/models", null, null,
            "https://openrouter.ai/models", 90),
        new("deepseek", "DeepSeek", "DeepSeek-V3, R1, Coder models.",
            "openai-compatible", "https://api.deepseek.com/v1", null,
            ["DEEPSEEK_API_KEY"], ["tools", "reasoning"],
            "https://api.deepseek.com/v1/models", null, null,
            "https://api-docs.deepseek.com/", 80),
        new("xai", "xAI (Grok)", "Grok 2/3/4 models.",
            "openai-compatible", "https://api.x.ai/v1", null,
            ["XAI_API_KEY"], ["tools", "reasoning"],
            "https://api.x.ai/v1/models", null, null,
            "https://docs.x.ai/docs/models", 70),
        new("groq", "Groq", "Ultra-fast LPU inference for open-source models.",
            "openai-compatible", "https://api.groq.com/openai/v1", null,
            ["GROQ_API_KEY"], ["tools"],
            "https://api.groq.com/openai/v1/models", null, null,
            "https://console.groq.com/docs/models", 65),
        new("mistral", "Mistral", "Mistral Large, Codestral and other Mistral models.",
            "openai-compatible", "https://api.mistral.ai/v1", null,
            ["MISTRAL_API_KEY"], ["tools"],
            "https://api.mistral.ai/v1/models", null, null,
            "https://docs.mistral.ai/getting-started/models/models_overview/", 55),
        new("together", "Together AI", "Fast inference for open-source models.",
            "openai-compatible", "https://api.together.xyz/v1", null,
            ["TOGETHER_API_KEY"], ["tools"],
            "https://api.together.xyz/v1/models", null, null,
            "https://docs.together.ai/docs/models-inference", 50),
        new("fireworks", "Fireworks AI", "High-performance inference for open-source models.",
            "openai-compatible", "https://api.fireworks.ai/inference/v1", null,
            ["FIREWORKS_API_KEY"], ["tools"],
            "https://api.fireworks.ai/inference/v1/models", null, null,
            "https://docs.fireworks.ai/models", 45),
        new("moonshot", "Moonshot (Kimi)", "Moonshot v1 / Kimi models.",
            "openai-compatible", "https://api.moonshot.cn/v1", null,
            ["MOONSHOT_API_KEY"], ["tools"],
            "https://api.moonshot.cn/v1/models", null, null,
            "https://platform.moonshot.cn/docs/intro", 45),
        new("huggingface", "Hugging Face", "Hugging Face Inference API router.",
            "openai-compatible", "https://router.huggingface.co/v1", null,
            ["HF_TOKEN"], ["tools"],
            "https://router.huggingface.co/v1/models", null, null,
            "https://huggingface.co/docs/inference-endpoints", 40),
        new("vercel-ai-gateway", "Vercel AI Gateway", "Vercel's AI gateway service.",
            "openai-compatible", "https://ai-gateway.vercel.sh/v1", null,
            ["AI_GATEWAY_API_KEY"], ["tools", "reasoning", "prompt-cache"],
            "https://ai-gateway.vercel.sh/v1/models", null, null,
            "https://vercel.com/docs/ai-gateway", 35),
        new("litellm", "LiteLLM (self-host)", "Self-hosted LiteLLM proxy (default http://localhost:4000).",
            "openai-compatible", "http://localhost:4000/v1", null,
            ["LITELLM_API_KEY"], ["tools", "prompt-cache"],
            "http://localhost:4000/v1/models", null, null,
            "https://docs.litellm.ai/", 30),
        new("requesty", "Requesty", "AI router with multiple provider support.",
            "openai-compatible", "https://router.requesty.ai/v1", null,
            ["REQUESTY_API_KEY"], ["tools", "reasoning"],
            "https://router.requesty.ai/v1/models", null, null,
            "https://requesty.ai/solution/llm-routing", 25),
        new("zai", "Z.AI (GLM)", "GLM-4.5/4.6/4.7 family.",
            "openai-compatible", "https://api.z.ai/api/paas/v4", null,
            ["ZHIPU_API_KEY"], ["tools", "reasoning"],
            "https://api.z.ai/api/paas/v4/models", null, null,
            "https://docs.z.ai/guides/overview/quick-start", 60),
        new("cerebras", "Cerebras", "Cerebras inference — extremely fast Llama 3.1/3.3, Qwen models.",
            "openai-compatible", "https://api.cerebras.ai/v1", null,
            ["CEREBRAS_API_KEY"], ["tools"],
            "https://api.cerebras.ai/v1/models", null, null,
            "https://docs.cerebras.ai/", 55),
        new("sambanova", "SambaNova", "SambaNova RDU — fast inference for open-source models.",
            "openai-compatible", "https://api.sambanova.ai/v1", null,
            ["SAMBANOVA_API_KEY"], ["tools"],
            "https://api.sambanova.ai/v1/models", null, null,
            "https://docs.sambanova.ai/", 40),
        new("nebius", "Nebius AI Studio", "Nebius — Llama, Qwen, DeepSeek, Mistral.",
            "openai-compatible", "https://api.studio.nebius.ai/v1", null,
            ["NEBIUS_API_KEY"], ["tools"],
            "https://api.studio.nebius.ai/v1/models", null, null,
            "https://docs.studio.nebius.ai/", 40),
        new("baseten", "Baseten", "Baseten inference — Llama, DeepSeek, custom models.",
            "openai-compatible", "https://inference.baseten.co/v1", null,
            ["BASETEN_API_KEY"], ["tools"],
            "https://inference.baseten.co/v1/models", null, null,
            "https://docs.baseten.co/", 35),
        new("poolside", "Poolside", "Poolside inference — reinforcement-learning tuned models.",
            "openai-compatible", "https://inference.poolside.ai/v1", null,
            ["POOLSIDE_API_KEY"], ["tools"],
            "https://inference.poolside.ai/v1/models", null, null,
            "https://poolside.ai/", 30),
        new("hicap", "Hicap", "Hicap — MiniMax, Kimi, GLM and other open models.",
            "openai-compatible", "https://api.hicap.ai/v2/openai", null,
            ["HICAP_API_KEY"], ["tools"],
            "https://api.hicap.ai/v2/openai/models", null, null,
            "https://docs.hicap.ai/", 30),
        new("v0", "Vercel v0", "Vercel v0 — generative UI model.",
            "openai-compatible", "https://api.v0.dev/v1", null,
            ["V0_API_KEY"], ["tools"], "https://api.v0.dev/v1/models", null, null,
            "https://v0.dev/", 30),
        new("aihubmix", "AIHubMix", "AIHubMix — multi-model gateway.",
            "openai-compatible", "https://aihubmix.com/v1", null,
            ["AIHUBMIX_API_KEY"], ["tools"],
            "https://aihubmix.com/v1/models", null, null,
            "https://doc.aihubmix.com/", 30),
        new("nousResearch", "Nous Research", "Nous Research — Hermes models.",
            "openai-compatible", "https://inference-api.nous.research/v1", null,
            ["NOUS_API_KEY"], ["tools"],
            "https://inference-api.nous.research/v1/models", null, null,
            "https://nousresearch.com/", 25),
        new("wandb", "Weights & Biases", "W&B Inference — Llama, DeepSeek, Qwen.",
            "openai-compatible", "https://api.inference.wandb.ai/v1", null,
            ["WANDB_API_KEY"], ["tools"],
            "https://api.inference.wandb.ai/v1/models", null, null,
            "https://docs.inference.wandb.ai/", 25),
        new("xiaomi", "Xiaomi MiMo", "Xiaomi MiMo models.",
            "openai-compatible", "https://api.xiaomimimo.com/v1", null,
            ["XIAOMI_API_KEY"], ["tools"],
            "https://api.xiaomimimo.com/v1/models", null, null,
            "https://xiaomimimo.com/", 20),
        new("kilocode", "Kilo Code", "Kilo Code — open-source models via kilo gateway.",
            "openai-compatible", "https://api.kilocode.ai/v1", null,
            ["KILOCODE_API_KEY"], ["tools"],
            "https://api.kilocode.ai/v1/models", null, null,
            "https://kilocode.ai/", 25),
        new("qwen", "Qwen (Alibaba)", "Qwen models via DashScope OpenAI-compatible.",
            "openai-compatible", "https://dashscope.aliyuncs.com/compatible-mode/v1", null,
            ["DASHSCOPE_API_KEY"], ["tools", "reasoning"],
            "https://dashscope.aliyuncs.com/compatible-mode/v1/models", null, null,
            "https://dashscope.aliyun.com/", 35),
        new("doubao", "Doubao (Volcengine)", "Doubao models via Volcengine Ark.",
            "openai-compatible", "https://ark.cn-beijing.volces.com/api/v3", null,
            ["ARK_API_KEY"], ["tools"],
            "https://ark.cn-beijing.volces.com/api/v3/models", null, null,
            "https://www.volcengine.com/docs/82379", 25),
        new("asksage", "AskSage", "AskSage — Claude, GPT, Mistral gateway.",
            "openai-compatible", "https://api.asksage.ai/server", null,
            ["ASKSAGE_API_KEY"], ["tools"],
            "https://api.asksage.ai/server/models", null, null,
            "https://docs.asksage.ai/", 20),
        new("dify", "Dify", "Dify self-hosted LLM platform.",
            "openai-compatible", "http://localhost/v1", null,
            ["DIFY_API_KEY"], ["tools"],
            "http://localhost/v1/models", null, null,
            "https://docs.dify.ai/", 20),
        new("oca", "OCA", "Oracle Cloud AI.",
            "openai-compatible", "https://inference.generativeai.us-chicago-1.oci.oraclecloud.com/v1", null,
            ["OCI_CONFIG"], ["tools"],
            null, null, null,
            "https://docs.oracle.com/en-us/iaas/Content/generative-ai/", 20),
        new("sapaicore", "SAP AI Core", "SAP AI Core — Claude, GPT, Mistral, etc.",
            "openai-compatible", null, null,
            ["AICORE_SERVICE_KEY"], ["tools"], null, null, null,
            "https://help.sap.com/docs/sap-ai-core", 20),
        new("huawei-cloud-maas", "Huawei Cloud MaaS", "Huawei Cloud ModelArts Studio.",
            "openai-compatible", "https://maas-cn-south-1.modelarts-maas.com/v1/infers", null,
            ["MAAS_API_KEY"], ["tools"],
            "https://maas-cn-south-1.modelarts-maas.com/v1/infers/models", null, null,
            "https://support.huaweicloud.com/intl/en-us/productdesc-modelarts/modelarts_productdesc_0003.html", 20),
        new("custom", "Custom (manual)", "Enter your own base URL, model, and API key.",
            "openai-compatible", null, null, [], [], null, null, null, null, 0)
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