namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Provider identifiers used throughout Kurisu. The values here are the
/// canonical wire-format strings that appear in <c>Settings.json</c>,
/// runtime selection, and the IPC contract.
/// </summary>
public static class ProviderIds
{
    /// <summary>Wire ID for the OpenAI provider.</summary>
    public const string OpenAI = "openai";
    /// <summary>Wire ID for the Anthropic provider.</summary>
    public const string Anthropic = "anthropic";
    /// <summary>Wire ID for the OpenAI native Responses API provider.</summary>
    public const string OpenAINative = "openai-native";
    /// <summary>Wire ID for the OpenAI Codex provider.</summary>
    public const string OpenAICodex = "openai-codex";
    /// <summary>Wire ID for the Claude Code CLI provider.</summary>
    public const string ClaudeCode = "claude-code";
    /// <summary>Wire ID for the AWS Bedrock provider.</summary>
    public const string Bedrock = "bedrock";
    /// <summary>Wire ID for the Google Vertex AI provider.</summary>
    public const string Vertex = "vertex";
    /// <summary>Wire ID for the Google Gemini API provider.</summary>
    public const string Gemini = "gemini";
    /// <summary>Wire ID for the local Ollama daemon.</summary>
    public const string Ollama = "ollama";
    /// <summary>Wire ID for the local LM Studio server.</summary>
    public const string LMStudio = "lmstudio";
    /// <summary>Wire ID for the OpenRouter aggregator.</summary>
    public const string OpenRouter = "openrouter";
    /// <summary>Wire ID for the Vercel AI Gateway.</summary>
    public const string VercelAIGateway = "vercel-ai-gateway";
    /// <summary>Wire ID for the DeepSeek provider.</summary>
    public const string DeepSeek = "deepseek";
    /// <summary>Wire ID for the xAI (Grok) provider.</summary>
    public const string Xai = "xai";
    /// <summary>Wire ID for the Groq provider.</summary>
    public const string Groq = "groq";
    /// <summary>Wire ID for the Mistral AI provider.</summary>
    public const string Mistral = "mistral";
    /// <summary>Wire ID for the Together AI provider.</summary>
    public const string Together = "together";
    /// <summary>Wire ID for the Fireworks AI provider.</summary>
    public const string Fireworks = "fireworks";
    /// <summary>Wire ID for the Moonshot (Kimi) provider.</summary>
    public const string Moonshot = "moonshot";
    /// <summary>Wire ID for the Hugging Face router provider.</summary>
    public const string HuggingFace = "huggingface";
    /// <summary>Wire ID for the LiteLLM self-hosted proxy.</summary>
    public const string LiteLLM = "litellm";
    /// <summary>Wire ID for the Requesty AI router.</summary>
    public const string Requesty = "requesty";
    /// <summary>Wire ID for the Z.AI (Zhipu / GLM) provider.</summary>
    public const string Zai = "zai";
    /// <summary>Wire ID for the Cerebras provider.</summary>
    public const string Cerebras = "cerebras";
    /// <summary>Wire ID for the SambaNova provider.</summary>
    public const string SambaNova = "sambanova";
    /// <summary>Wire ID for the Nebius AI Studio provider.</summary>
    public const string Nebius = "nebius";
    /// <summary>Wire ID for the Baseten provider.</summary>
    public const string Baseten = "baseten";
    /// <summary>Wire ID for the Poolside provider.</summary>
    public const string Poolside = "poolside";
    /// <summary>Wire ID for the Hicap provider.</summary>
    public const string Hicap = "hicap";
    /// <summary>Wire ID for the v0 provider.</summary>
    public const string V0 = "v0";
    /// <summary>Wire ID for the AIHubMix provider.</summary>
    public const string AIHubMix = "aihubmix";
    /// <summary>Wire ID for the Nous Research provider.</summary>
    public const string NousResearch = "nousResearch";
    /// <summary>Wire ID for the W&amp;B Inference provider.</summary>
    public const string Wandb = "wandb";
    /// <summary>Wire ID for the Xiaomi MiMo provider.</summary>
    public const string Xiaomi = "xiaomi";
    /// <summary>Wire ID for the Kilo Code provider.</summary>
    public const string KiloCode = "kilocode";
    /// <summary>Wire ID for the Qwen provider (legacy; use DashScope).</summary>
    public const string Qwen = "qwen";
    /// <summary>Wire ID for the DashScope (Alibaba) provider.</summary>
    public const string DashScope = "dashscope";
    /// <summary>Wire ID for the Doubao (Volcengine Ark) provider.</summary>
    public const string Doubao = "doubao";
    /// <summary>Wire ID for the AskSage provider.</summary>
    public const string AskSage = "asksage";
    /// <summary>Wire ID for the Dify self-hosted platform.</summary>
    public const string Dify = "dify";
    /// <summary>Wire ID for the Oracle Cloud AI provider.</summary>
    public const string OCA = "oca";
    /// <summary>Wire ID for the SAP AI Core provider.</summary>
    public const string SAPAICore = "sapaicore";
    /// <summary>Wire ID for the Huawei Cloud MaaS provider.</summary>
    public const string HuaweiCloudMaas = "huawei-cloud-maas";
    /// <summary>Wire ID for the user-defined custom provider.</summary>
    public const string Custom = "custom";

    /// <summary>Fallback provider when no selection is set.</summary>
    public const string Default = OpenAI;
}
