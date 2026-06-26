namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Environment variable names that provider settings look up when resolving
/// API keys. The values here are the canonical env-var strings that
/// appear in user shell configurations.
/// </summary>
public static class ProviderEnvVars
{
    /// <summary>Env var for <c>openai</c> provider.</summary>
    public const string OpenAI = "OPENAI_API_KEY";
    /// <summary>Env var for <c>anthropic</c> provider.</summary>
    public const string Anthropic = "ANTHROPIC_API_KEY";
    /// <summary>Env var for <c>claude-code</c> provider.</summary>
    public const string ClaudeCode = "CLAUDE_CODE_API_KEY";
    /// <summary>Env var for <c>gemini</c> provider.</summary>
    public const string Gemini = "GEMINI_API_KEY";
    /// <summary>Env var for <c>google</c> search-provider API key.</summary>
    public const string Google = "GOOGLE_API_KEY";
    /// <summary>Env var for <c>deepseek</c> provider.</summary>
    public const string DeepSeek = "DEEPSEEK_API_KEY";
    /// <summary>Env var for <c>xai</c> provider.</summary>
    public const string Xai = "XAI_API_KEY";
    /// <summary>Env var for <c>groq</c> provider.</summary>
    public const string Groq = "GROQ_API_KEY";
    /// <summary>Env var for <c>mistral</c> provider.</summary>
    public const string Mistral = "MISTRAL_API_KEY";
    /// <summary>Env var for <c>together</c> provider.</summary>
    public const string Together = "TOGETHER_API_KEY";
    /// <summary>Env var for <c>fireworks</c> provider.</summary>
    public const string Fireworks = "FIREWORKS_API_KEY";
    /// <summary>Env var for <c>moonshot</c> provider.</summary>
    public const string Moonshot = "MOONSHOT_API_KEY";
    /// <summary>Env var for <c>huggingface</c> provider.</summary>
    public const string HuggingFace = "HF_TOKEN";
    /// <summary>Env var for <c>vercel-ai-gateway</c> provider.</summary>
    public const string VercelAIGateway = "AI_GATEWAY_API_KEY";
    /// <summary>Env var for <c>litellm</c> provider.</summary>
    public const string LiteLLM = "LITELLM_API_KEY";
    /// <summary>Env var for <c>requesty</c> provider.</summary>
    public const string Requesty = "REQUESTY_API_KEY";
    /// <summary>Env var for <c>zai</c> provider (Zhipu / Z.AI).</summary>
    public const string Zhipu = "ZHIPU_API_KEY";
    /// <summary>Env var for <c>cerebras</c> provider.</summary>
    public const string Cerebras = "CEREBRAS_API_KEY";
    /// <summary>Env var for <c>sambanova</c> provider.</summary>
    public const string SambaNova = "SAMBANOVA_API_KEY";
    /// <summary>Env var for <c>nebius</c> provider.</summary>
    public const string Nebius = "NEBIUS_API_KEY";
    /// <summary>Env var for <c>baseten</c> provider.</summary>
    public const string Baseten = "BASETEN_API_KEY";
    /// <summary>Env var for <c>poolside</c> provider.</summary>
    public const string Poolside = "POOLSIDE_API_KEY";
    /// <summary>Env var for <c>hicap</c> provider.</summary>
    public const string Hicap = "HICAP_API_KEY";
    /// <summary>Env var for <c>v0</c> provider.</summary>
    public const string V0 = "V0_API_KEY";
    /// <summary>Env var for <c>aihubmix</c> provider.</summary>
    public const string AIHubMix = "AIHUBMIX_API_KEY";
    /// <summary>Env var for <c>nousResearch</c> provider.</summary>
    public const string NousResearch = "NOUS_API_KEY";
    /// <summary>Env var for <c>wandb</c> provider.</summary>
    public const string Wandb = "WANDB_API_KEY";
    /// <summary>Env var for <c>xiaomi</c> provider.</summary>
    public const string Xiaomi = "XIAOMI_API_KEY";
    /// <summary>Env var for <c>kilocode</c> provider.</summary>
    public const string KiloCode = "KILOCODE_API_KEY";
    /// <summary>Env var for <c>dashscope</c> (formerly <c>qwen</c>) provider.</summary>
    public const string DashScopeApiKey = "DASHSCOPE_API_KEY";
    /// <summary>Env var for <c>doubao</c> provider (Volcengine Ark).</summary>
    public const string Ark = "ARK_API_KEY";
    /// <summary>Env var for <c>asksage</c> provider.</summary>
    public const string AskSage = "ASKSAGE_API_KEY";
    /// <summary>Env var for <c>dify</c> provider.</summary>
    public const string Dify = "DIFY_API_KEY";
    /// <summary>Env var for <c>oca</c> (Oracle Cloud AI) config path.</summary>
    public const string OCI = "OCI_CONFIG";
    /// <summary>Env var for <c>sapaicore</c> (SAP AI Core) service key.</summary>
    public const string SAPAICore = "AICORE_SERVICE_KEY";
    /// <summary>Env var for <c>huawei-cloud-maas</c> provider.</summary>
    public const string HuaweiCloudMaas = "MAAS_API_KEY";
    /// <summary>Env var for <c>openrouter</c> provider.</summary>
    public const string OpenRouterApiKey = "OPENROUTER_API_KEY";
    /// <summary>Env var for <c>ollama</c> local provider.</summary>
    public const string Ollama = "OLLAMA_API_KEY";
    /// <summary>Env var for Tavily web search provider.</summary>
    public const string Tavily = "TAVILY_API_KEY";
    /// <summary>Generic web-search API key env var.</summary>
    public const string WebSearch = "WEB_SEARCH_API_KEY";
    /// <summary>Env var for Google Custom Search API key.</summary>
    public const string GoogleSearch = "GOOGLE_SEARCH_API_KEY";
    /// <summary>Env var for Google Custom Search Engine ID.</summary>
    public const string GoogleSearchEngineId = "GOOGLE_SEARCH_ENGINE_ID";
    /// <summary>Alias for Google CSE ID.</summary>
    public const string GoogleCSE = "GOOGLE_CSE_ID";
}
