namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Capability tags advertised by provider manifests. Wire format is
/// preserved as <c>string[]</c> for IPC compatibility; this class is
/// the type-safe lookup table for C# code.
/// </summary>
public static class ProviderCapabilities
{
    /// <summary>The provider can invoke tools (function calling).</summary>
    public const string Tools = "tools";
    /// <summary>The provider supports extended reasoning (chain-of-thought).</summary>
    public const string Reasoning = "reasoning";
    /// <summary>The provider supports JSON mode (structured output).</summary>
    public const string Json = "json";
    /// <summary>The provider can accept image inputs (vision models).</summary>
    public const string Vision = "vision";
    /// <summary>The provider exposes an embeddings endpoint.</summary>
    public const string Embeddings = "embeddings";
    /// <summary>The provider supports Anthropic prompt caching.</summary>
    public const string PromptCache = "prompt-cache";
    /// <summary>The provider is the OpenAI Codex (codex-1) endpoint.</summary>
    public const string Codex = "codex";
    /// <summary>The provider integrates with Google services (Vertex, Gemini).</summary>
    public const string Google = "google";
    /// <summary>The provider integrates with AWS (Bedrock).</summary>
    public const string Aws = "aws";
}
