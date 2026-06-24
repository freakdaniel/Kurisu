using Kurisu.Core.Sessions.Persistence;
using Microsoft.Extensions.Logging;

namespace Kurisu.Core.Sessions.Memory;

/// <summary>
/// One hit returned to callers of <see cref="SessionMemoryRetriever.RecallAsync"/>:
/// the session id, the matched chunk excerpt, and a similarity score (1.0
/// = identical, 0.0 = orthogonal — derived from sqlite-vec's cosine distance).
/// </summary>
/// <param name="SessionId">Session the match came from.</param>
/// <param name="Title">Title of the session (for display).</param>
/// <param name="Excerpt">Matched chunk text.</param>
/// <param name="Similarity">0..1, higher is better.</param>
public sealed record RetrievedMemory(
    string SessionId,
    string Title,
    string Excerpt,
    float Similarity);

/// <summary>
/// High-level API for retrieving semantically similar past sessions given a
/// natural-language query. Used by the assistant runtime to surface
/// "alongside model memory" — relevant fragments from earlier sessions are
/// injected into the prompt as additional context.
/// </summary>
public sealed class SessionMemoryRetriever
{
    private readonly SessionsDb _sessions;
    private readonly VectorsDb _vectors;
    private readonly IReadOnlyList<Func<string, Task<float[]?>>> _embeddingProviders;
    private readonly ILogger<SessionMemoryRetriever> _logger;

    /// <summary>
    /// Creates the retriever. <paramref name="embeddingProviders"/> is an
    /// ordered list of embedding functions; the first non-null result is used.
    /// This indirection lets callers inject their own embedding pipeline
    /// (e.g. an <c>IContentGenerator</c>-backed implementation).
    /// </summary>
    public SessionMemoryRetriever(
        SessionsDb sessions,
        VectorsDb vectors,
        IEnumerable<Func<string, Task<float[]?>>> embeddingProviders,
        ILogger<SessionMemoryRetriever> logger)
    {
        _sessions = sessions;
        _vectors = vectors;
        _embeddingProviders = embeddingProviders.ToArray();
        _logger = logger;
    }

    /// <summary>
    /// Returns the top-<paramref name="topK"/> sessions most semantically
    /// similar to <paramref name="query"/>. Returns an empty list if the
    /// vector index is empty or no embedding provider can produce a vector
    /// for the query.
    /// </summary>
    public async Task<IReadOnlyList<RetrievedMemory>> RecallAsync(
        string query,
        int topK = 5,
        CancellationToken ct = default)
    {
        if (topK <= 0) topK = 5;
        if (string.IsNullOrWhiteSpace(query))
        {
            return [];
        }

        float[]? embedding = null;
        foreach (var provider in _embeddingProviders)
        {
            try
            {
                embedding = await provider(query).ConfigureAwait(false);
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Embedding provider failed for memory recall");
            }
            if (embedding is not null && embedding.Length > 0)
            {
                break;
            }
        }

        if (embedding is null)
        {
            _logger.LogDebug("No embedding produced; returning empty memory set.");
            return [];
        }

        var hits = _vectors.Search(embedding, topK);
        if (hits.Count == 0) return [];

        // Enrich with title from sessions DB.
        var results = new List<RetrievedMemory>(hits.Count);
        foreach (var hit in hits)
        {
            var meta = _sessions.Get(hit.SessionId);
            results.Add(new RetrievedMemory(
                SessionId: hit.SessionId,
                Title: meta?.Title ?? "(untitled)",
                Excerpt: hit.Excerpt,
                Similarity: 1f - Math.Min(hit.Distance, 1f)));
        }
        return results;
    }
}