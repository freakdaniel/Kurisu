namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Chat-completions flavor tags used to select the right
/// <c>IAssistantResponseProvider</c> implementation at runtime.
/// </summary>
public static class ProviderFlavors
{
    /// <summary>OpenAI-compatible chat-completions wire format.</summary>
    public const string OpenAiCompatible = "openai-compatible";
    /// <summary>OpenRouter-specific response format quirks.</summary>
    public const string OpenRouter = "openrouter";
    /// <summary>DeepSeek-specific response format quirks.</summary>
    public const string DeepSeek = "deepseek";
    /// <summary>DashScope (Alibaba) specific response format quirks.</summary>
    public const string DashScope = "dashscope";
    /// <summary>Z.AI (Zhipu / GLM) specific response format quirks.</summary>
    public const string Zai = "zai";
}
