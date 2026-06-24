namespace Kurisu.Core.Sessions.Persistence;

/// <summary>
/// Stored projection of a session in the metadata database. Mirrors the
/// columns of the <c>sessions</c> table; constructed either from the
/// JSONL transcript during migration or incrementally as messages are
/// written.
/// </summary>
public sealed class SessionRecord
{
    /// <summary>Stable session id (same as the JSONL filename).</summary>
    public required string SessionId { get; init; }

    /// <summary>Workspace root this session belongs to.</summary>
    public required string WorkspacePath { get; init; }

    /// <summary>First-user-message snippet used as the sidebar title.</summary>
    public required string Title { get; init; }

    /// <summary>Provider id (<c>openai</c>, <c>anthropic</c>, ...).</summary>
    public required string ProviderId { get; init; }

    /// <summary>Specific model used; null if unknown / heterogeneous.</summary>
    public string? ModelId { get; init; }

    /// <summary>One of <c>active</c>, <c>completed</c>, <c>crashed</c>, <c>archived</c>.</summary>
    public required string Status { get; init; }

    /// <summary>Wall-clock time the session was created.</summary>
    public required DateTimeOffset CreatedAt { get; init; }

    /// <summary>Last activity timestamp (used for sorting).</summary>
    public required DateTimeOffset UpdatedAt { get; init; }

    /// <summary>Time the session finished; null while still active.</summary>
    public DateTimeOffset? EndedAt { get; init; }

    /// <summary>Number of messages in the transcript.</summary>
    public int MessageCount { get; init; }

    /// <summary>Cumulative input tokens for the session.</summary>
    public int TokenInput { get; init; }

    /// <summary>Cumulative output tokens for the session.</summary>
    public int TokenOutput { get; init; }

    /// <summary>Size of the JSONL transcript on disk in bytes.</summary>
    public int SizeBytes { get; init; }

    /// <summary>Category tag (<c>coder</c>, <c>chats</c>, ...).</summary>
    public required string Category { get; init; }

    /// <summary>Desktop mode tag (<c>desktop</c>, <c>headless</c>, ...).</summary>
    public required string Mode { get; init; }

    /// <summary>Persisted interrupted-turn state, if any (for resume on next launch).</summary>
    public string? InterruptedTurnJson { get; init; }

    /// <summary>Absolute path to the JSONL transcript file.</summary>
    public required string TranscriptPath { get; init; }

    /// <summary>Short summary used for sidebar preview and FTS index.</summary>
    public required string Summary { get; init; }
}