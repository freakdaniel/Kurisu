using System.Text.Json;
using System.Text.Json.Nodes;

using Kurisu.Core.Infrastructure;
using Kurisu.Core.Runtime;
using Kurisu.Core.Runtime.Providers;
using Kurisu.Core.Sessions.Persistence;
using Microsoft.Extensions.Logging;

namespace Kurisu.Core.Sessions.Memory;

/// <summary>
/// Reads session JSONL transcripts, splits them into ~512-token chunks,
/// generates an embedding per chunk via the configured content generator, and
/// persists them into <see cref="VectorsDb"/>. Called on session end (or via
/// <see cref="SessionsMigration"/> for existing jsonl files).
/// </summary>
public sealed class EmbeddingIndexer
{
    private const int MaxChunkChars = 2000; // ~512 tokens for typical English text
    private const int ChunkOverlapChars = 200;

    private readonly SessionsDb _sessions;
    private readonly VectorsDb _vectors;
    private readonly IContentGenerator _generator;
    private readonly ProviderSettingsStore _settings;
    private readonly ILogger<EmbeddingIndexer> _logger;

    /// <summary>
    /// Creates the indexer. <paramref name="settings"/> is consulted at index
    /// time to resolve the api key for the configured embedding provider.
    /// </summary>
    public EmbeddingIndexer(
        SessionsDb sessions,
        VectorsDb vectors,
        IContentGenerator generator,
        ProviderSettingsStore settings,
        ILogger<EmbeddingIndexer> logger)
    {
        _sessions = sessions;
        _vectors = vectors;
        _generator = generator;
        _settings = settings;
        _logger = logger;
    }

    /// <summary>
    /// Indexes a single session: reads its transcript, derives title +
    /// summary from the first user message, and persists embeddings for all
    /// chunks. Idempotent: re-indexing replaces the prior chunks for the
    /// session.
    /// </summary>
    public async Task IndexSessionAsync(
        KurisuRuntimeProfile profile,
        string sessionId,
        CancellationToken ct = default)
    {
        var transcriptPath = KurisuPaths.SessionTranscriptFile(profile, sessionId);
        if (!File.Exists(transcriptPath))
        {
            _logger.LogDebug("Session {Id}: transcript file missing, skipping.", sessionId);
            return;
        }

        var transcript = await File.ReadAllTextAsync(transcriptPath, ct).ConfigureAwait(false);
        var chunks = ChunkTranscript(transcript);
        if (chunks.Count == 0)
        {
            return;
        }

        var title = ExtractTitle(transcript);
        var summary = chunks[0].Length > 240 ? chunks[0][..240] : chunks[0];

        // Upsert metadata so the session row exists even if embeddings fail.
        _sessions.Upsert(new SessionRecord
        {
            SessionId = sessionId,
            WorkspacePath = profile.ProjectRoot,
            Title = title,
            ProviderId = ResolveProviderId(profile),
            ModelId = ResolveModelId(profile),
            Status = "completed",
            CreatedAt = ResolveCreatedAt(profile, sessionId, transcriptPath),
            UpdatedAt = DateTimeOffset.UtcNow,
            EndedAt = DateTimeOffset.UtcNow,
            MessageCount = CountMessages(transcript),
            TokenInput = 0,
            TokenOutput = 0,
            SizeBytes = (int)new FileInfo(transcriptPath).Length,
            Category = ResolveCategory(profile),
            Mode = "desktop",
            InterruptedTurnJson = null,
            TranscriptPath = transcriptPath,
            Summary = summary,
        });

        // Resolve embedding model from settings or env.
        var embeddingManifest = ResolveEmbeddingManifest();
        if (embeddingManifest is null)
        {
            _logger.LogWarning("No embedding provider configured; session {Id} metadata only.", sessionId);
            return;
        }

        var apiKey = _settings.ResolveApiKey(embeddingManifest);
        var baseUrl = _settings.ResolveBaseUrl(embeddingManifest);
        var modelId = !string.IsNullOrWhiteSpace(embeddingManifest.DefaultModelId)
            ? embeddingManifest.DefaultModelId
            : embeddingManifest.Id;

        var embeddings = new List<EmbeddingChunk>(chunks.Count);
        for (var i = 0; i < chunks.Count; i++)
        {
            var response = await GenerateEmbeddingAsync(profile, modelId, apiKey ?? string.Empty, baseUrl ?? embeddingManifest.DefaultBaseUrl ?? string.Empty, chunks[i], ct).ConfigureAwait(false);
            if (response is null || response.Embedding.Count == 0)
            {
                _logger.LogDebug("Embedding failed for chunk {Index} of {Id}; skipping.", i, sessionId);
                continue;
            }
            embeddings.Add(new EmbeddingChunk(
                SessionId: sessionId,
                ChunkIndex: i,
                Excerpt: chunks[i],
                Embedding: response.Embedding.ToArray(),
                ModelId: response.Model ?? modelId));
        }

        if (embeddings.Count > 0)
        {
            _vectors.UpsertSessionChunks(sessionId, embeddings);
        }
    }

    /// <summary>
    /// Convenience overload that derives the transcript path from
    /// <paramref name="sessionId"/> using the chats directory on
    /// <paramref name="profile"/>.
    /// </summary>
    public Task IndexAllAsync(KurisuRuntimeProfile profile, CancellationToken ct = default)
        => IndexSessionAsync(profile, Path.GetFileNameWithoutExtension(profile.ChatsDirectory), ct);

    private static IReadOnlyList<string> ChunkTranscript(string transcript)
    {
        if (string.IsNullOrWhiteSpace(transcript))
        {
            return [];
        }

        // Each JSONL line is a complete message; chunk across messages too
        // long to fit in a single chunk.
        var messages = transcript
            .Split('\n', StringSplitOptions.RemoveEmptyEntries)
            .Where(static line => !string.IsNullOrWhiteSpace(line))
            .ToArray();
        if (messages.Length == 0)
        {
            return [];
        }

        var chunks = new List<string>();
        var current = new System.Text.StringBuilder();
        foreach (var line in messages)
        {
            if (current.Length + line.Length + 1 > MaxChunkChars && current.Length > 0)
            {
                chunks.Add(current.ToString());
                current.Clear();
                // Keep overlap from previous chunk.
                if (chunks.Count > 0 && chunks[^1].Length > ChunkOverlapChars)
                {
                    current.Append(chunks[^1][^ChunkOverlapChars..]);
                    current.Append('\n');
                }
            }
            current.Append(line);
            current.Append('\n');
        }
        if (current.Length > 0)
        {
            chunks.Add(current.ToString());
        }
        return chunks;
    }

    private static string ExtractTitle(string transcript)
    {
        try
        {
            foreach (var line in transcript.Split('\n'))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                using var doc = JsonDocument.Parse(line);
                var root = doc.RootElement;
                if (root.TryGetProperty("role", out var role) && role.GetString() == "user" &&
                    root.TryGetProperty("content", out var content))
                {
                    var text = content.ValueKind == JsonValueKind.String
                        ? content.GetString()
                        : content.GetRawText();
                    if (string.IsNullOrWhiteSpace(text)) continue;
                    var single = text.Replace('\n', ' ').Replace('\r', ' ').Trim();
                    return single.Length > 80 ? single[..80] : single;
                }
            }
        }
        catch (JsonException)
        {
            // Best-effort title extraction.
        }
        return "(untitled session)";
    }

    private static int CountMessages(string transcript)
    {
        var count = 0;
        foreach (var line in transcript.Split('\n'))
        {
            if (!string.IsNullOrWhiteSpace(line))
            {
                count++;
            }
        }
        return count;
    }

    private async Task<EmbeddingGenerationResponse?> GenerateEmbeddingAsync(
        KurisuRuntimeProfile profile,
        string modelId,
        string apiKey,
        string endpoint,
        string text,
        CancellationToken ct)
    {
        try
        {
            var request = new EmbeddingGenerationRequest
            {
                SessionId = "embedding",
                Input = text,
                WorkingDirectory = profile.ProjectRoot,
                RuntimeProfile = profile,
                ModelOverride = modelId,
                EndpointOverride = endpoint,
                ApiKeyOverride = apiKey,
            };
            return await _generator.GenerateEmbeddingAsync(request, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Embedding call failed");
            return null;
        }
    }

    private ProviderManifest? ResolveEmbeddingManifest()
    {
        // The user has likely configured an OpenAI-compatible provider; reuse
        // its base URL and key. For a real embedding-dedicated provider we
        // would consult RuntimeSelectionStore here, but that does not exist
        // yet — fall back to any configured provider for now.
        foreach (var manifest in ProviderCatalog.Builtins)
        {
            if (_settings.ResolveApiKey(manifest) is not null)
            {
                return manifest;
            }
        }
        return null;
    }

    private static string ResolveProviderId(KurisuRuntimeProfile profile) => "unknown";

    private static string ResolveModelId(KurisuRuntimeProfile profile) => string.Empty;

    private static string ResolveCategory(KurisuRuntimeProfile profile) => "coder";

    private static DateTimeOffset ResolveCreatedAt(
        KurisuRuntimeProfile profile,
        string sessionId,
        string transcriptPath)
    {
        try
        {
            return new FileInfo(transcriptPath).CreationTimeUtc;
        }
        catch
        {
            return DateTimeOffset.UtcNow;
        }
    }
}