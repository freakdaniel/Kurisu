using Kurisu.Core.Models;
using Microsoft.Data.Sqlite;

namespace Kurisu.Core.Sessions.Persistence;

/// <summary>
/// SQLite-backed metadata + full-text-search index for sessions. The full
/// transcript is still stored as a JSONL file under
/// <c>~/.kurisu/&lt;workspace&gt;/Chats</c>; this database only holds the
/// fields needed to render the sidebar and to search quickly.
/// </summary>
public sealed class SessionsDb : IDisposable
{
    private readonly string _dbPath;
    private readonly SqliteConnection _connection;
    private readonly object _gate = new();

    /// <summary>Opens or creates the database at <paramref name="dbPath"/>.</summary>
    public SessionsDb(string dbPath)
    {
        _dbPath = dbPath;
        var dir = Path.GetDirectoryName(dbPath);
        if (!string.IsNullOrEmpty(dir))
        {
            Directory.CreateDirectory(dir);
        }
        _connection = new SqliteConnection($"Data Source={dbPath}");
        _connection.Open();
        EnsureSchema();
    }

    /// <summary>Path of the SQLite database file.</summary>
    public string DbPath => _dbPath;

    /// <summary>
    /// Creates tables and indexes if they do not exist. Safe to call repeatedly.
    /// </summary>
    public void EnsureSchema()
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS sessions (
                id              TEXT PRIMARY KEY,
                workspace_path  TEXT NOT NULL,
                title           TEXT NOT NULL,
                provider_id     TEXT NOT NULL,
                model_id        TEXT,
                status          TEXT NOT NULL,
                created_at      INTEGER NOT NULL,
                updated_at      INTEGER NOT NULL,
                ended_at        INTEGER,
                message_count   INTEGER NOT NULL DEFAULT 0,
                token_input     INTEGER NOT NULL DEFAULT 0,
                token_output    INTEGER NOT NULL DEFAULT 0,
                size_bytes      INTEGER NOT NULL DEFAULT 0,
                category        TEXT NOT NULL DEFAULT 'coder',
                mode            TEXT NOT NULL DEFAULT 'desktop',
                interrupted_turn_json TEXT,
                transcript_path TEXT NOT NULL,
                summary         TEXT NOT NULL DEFAULT ''
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_workspace_updated
                ON sessions(workspace_path, updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_sessions_status
                ON sessions(status);
            CREATE INDEX IF NOT EXISTS idx_sessions_provider
                ON sessions(provider_id);

            CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
                id UNINDEXED,
                title,
                summary,
                content='',
                tokenize='porter unicode61'
            );

            CREATE TRIGGER IF NOT EXISTS sessions_ai AFTER INSERT ON sessions BEGIN
                INSERT INTO sessions_fts(id, title, summary)
                VALUES (new.id, new.title, new.summary);
            END;
            CREATE TRIGGER IF NOT EXISTS sessions_ad AFTER DELETE ON sessions BEGIN
                DELETE FROM sessions_fts WHERE id = old.id;
            END;
            CREATE TRIGGER IF NOT EXISTS sessions_au AFTER UPDATE ON sessions BEGIN
                UPDATE sessions_fts SET title = new.title, summary = new.summary
                WHERE id = new.id;
            END;
        ";
        cmd.ExecuteNonQuery();

        // Pragmas for write-ahead logging and reasonable durability.
        using var pragma = _connection.CreateCommand();
        pragma.CommandText = "PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;";
        pragma.ExecuteNonQuery();
    }

    /// <summary>
    /// Inserts or replaces a session record. Uses upsert semantics on the
    /// primary key so the same call works for new sessions and incremental
    /// metadata updates.
    /// </summary>
    public void Upsert(SessionRecord record)
    {
        lock (_gate)
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                INSERT OR REPLACE INTO sessions (
                    id, workspace_path, title, provider_id, model_id, status,
                    created_at, updated_at, ended_at, message_count,
                    token_input, token_output, size_bytes,
                    category, mode, interrupted_turn_json, transcript_path, summary
                ) VALUES (
                    $id, $workspace, $title, $provider, $model, $status,
                    $createdAt, $updatedAt, $endedAt, $msgCount,
                    $tokensIn, $tokensOut, $size,
                    $category, $mode, $interruptedTurn, $transcriptPath, $summary
                )";
            cmd.Parameters.AddWithValue("$id", record.SessionId);
            cmd.Parameters.AddWithValue("$workspace", record.WorkspacePath ?? string.Empty);
            cmd.Parameters.AddWithValue("$title", record.Title ?? string.Empty);
            cmd.Parameters.AddWithValue("$provider", record.ProviderId ?? string.Empty);
            cmd.Parameters.AddWithValue("$model", (object?)record.ModelId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("$status", record.Status ?? "completed");
            cmd.Parameters.AddWithValue("$createdAt", record.CreatedAt.ToUnixTimeMilliseconds());
            cmd.Parameters.AddWithValue("$updatedAt", record.UpdatedAt.ToUnixTimeMilliseconds());
            cmd.Parameters.AddWithValue("$endedAt", (object?)record.EndedAt?.ToUnixTimeMilliseconds() ?? DBNull.Value);
            cmd.Parameters.AddWithValue("$msgCount", record.MessageCount);
            cmd.Parameters.AddWithValue("$tokensIn", record.TokenInput);
            cmd.Parameters.AddWithValue("$tokensOut", record.TokenOutput);
            cmd.Parameters.AddWithValue("$size", record.SizeBytes);
            cmd.Parameters.AddWithValue("$category", record.Category ?? "coder");
            cmd.Parameters.AddWithValue("$mode", record.Mode ?? "desktop");
            cmd.Parameters.AddWithValue("$interruptedTurn", (object?)record.InterruptedTurnJson ?? DBNull.Value);
            cmd.Parameters.AddWithValue("$transcriptPath", record.TranscriptPath ?? string.Empty);
            cmd.Parameters.AddWithValue("$summary", record.Summary ?? string.Empty);
            cmd.ExecuteNonQuery();
        }
    }

    /// <summary>Returns the row for <paramref name="sessionId"/> or null.</summary>
    public SessionRecord? Get(string sessionId)
    {
        lock (_gate)
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                SELECT id, workspace_path, title, provider_id, model_id, status,
                       created_at, updated_at, ended_at, message_count,
                       token_input, token_output, size_bytes,
                       category, mode, interrupted_turn_json, transcript_path, summary
                FROM sessions WHERE id = $id";
            cmd.Parameters.AddWithValue("$id", sessionId);
            using var reader = cmd.ExecuteReader();
            return reader.Read() ? ReadRecord(reader) : null;
        }
    }

    /// <summary>
    /// Returns the most-recently-updated sessions for the given workspace.
    /// Backed by <c>idx_sessions_workspace_updated</c> so it stays cheap even
    /// with thousands of sessions.
    /// </summary>
    public IReadOnlyList<SessionPreview> ListByWorkspace(
        string workspacePath,
        int limit,
        string? statusFilter = null)
    {
        if (limit <= 0) limit = 24;

        lock (_gate)
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = statusFilter is null
                ? @"
                    SELECT id, title, updated_at, message_count,
                           provider_id, model_id, category, mode, status,
                           workspace_path, transcript_path
                    FROM sessions
                    WHERE workspace_path = $workspace
                    ORDER BY updated_at DESC
                    LIMIT $limit"
                : @"
                    SELECT id, title, updated_at, message_count,
                           provider_id, model_id, category, mode, status,
                           workspace_path, transcript_path
                    FROM sessions
                    WHERE workspace_path = $workspace AND status = $status
                    ORDER BY updated_at DESC
                    LIMIT $limit";
            cmd.Parameters.AddWithValue("$workspace", workspacePath);
            cmd.Parameters.AddWithValue("$limit", limit);
            if (statusFilter is not null)
            {
                cmd.Parameters.AddWithValue("$status", statusFilter);
            }

            var results = new List<SessionPreview>(Math.Min(limit, 64));
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                results.Add(new SessionPreview
                {
                    SessionId = reader.GetString(0),
                    Title = reader.IsDBNull(1) ? null : reader.GetString(1),
                    LastActivity = DateTimeOffset.FromUnixTimeMilliseconds(reader.GetInt64(2)).ToString("o"),
                    StartedAt = DateTimeOffset.FromUnixTimeMilliseconds(reader.GetInt64(2)).ToString("o"),
                    LastUpdatedAt = DateTimeOffset.FromUnixTimeMilliseconds(reader.GetInt64(2)).ToString("o"),
                    MessageCount = reader.GetInt32(3),
                    Category = reader.IsDBNull(6) ? "coder" : reader.GetString(6),
                    Mode = ParseMode(reader.IsDBNull(7) ? "desktop" : reader.GetString(7)),
                    Status = reader.IsDBNull(8) ? "completed" : reader.GetString(8),
                    WorkingDirectory = reader.IsDBNull(9) ? workspacePath : reader.GetString(9),
                    GitBranch = string.Empty,
                    TranscriptPath = reader.IsDBNull(10) ? string.Empty : reader.GetString(10),
                    MetadataPath = string.Empty,
                });
            }
            return results;
        }
    }

    /// <summary>
    /// Full-text search over titles and summaries. Empty <paramref name="query"/>
    /// returns the most recent sessions (same as <see cref="ListByWorkspace"/>).
    /// </summary>
    public IReadOnlyList<SessionPreview> SearchFts(
        string workspacePath,
        string query,
        int limit)
    {
        if (limit <= 0) limit = 24;

        lock (_gate)
        {
            using var cmd = _connection.CreateCommand();
            if (string.IsNullOrWhiteSpace(query))
            {
                return ListByWorkspace(workspacePath, limit);
            }

            cmd.CommandText = @"
                SELECT s.id, s.title, s.updated_at, s.message_count,
                       s.provider_id, s.model_id, s.category, s.mode, s.status,
                       s.workspace_path, s.transcript_path,
                       bm25(sessions_fts) AS rank
                FROM sessions_fts
                JOIN sessions s ON s.id = sessions_fts.id
                WHERE sessions_fts MATCH $query
                  AND s.workspace_path = $workspace
                ORDER BY rank
                LIMIT $limit";
            cmd.Parameters.AddWithValue("$query", EscapeFtsQuery(query));
            cmd.Parameters.AddWithValue("$workspace", workspacePath);
            cmd.Parameters.AddWithValue("$limit", limit);

            var results = new List<SessionPreview>(Math.Min(limit, 64));
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                results.Add(new SessionPreview
                {
                    SessionId = reader.GetString(0),
                    Title = reader.IsDBNull(1) ? null : reader.GetString(1),
                    LastActivity = DateTimeOffset.FromUnixTimeMilliseconds(reader.GetInt64(2)).ToString("o"),
                    StartedAt = DateTimeOffset.FromUnixTimeMilliseconds(reader.GetInt64(2)).ToString("o"),
                    LastUpdatedAt = DateTimeOffset.FromUnixTimeMilliseconds(reader.GetInt64(2)).ToString("o"),
                    MessageCount = reader.GetInt32(3),
                    Category = reader.IsDBNull(6) ? "coder" : reader.GetString(6),
                    Mode = ParseMode(reader.IsDBNull(7) ? "desktop" : reader.GetString(7)),
                    Status = reader.IsDBNull(8) ? "completed" : reader.GetString(8),
                    WorkingDirectory = reader.IsDBNull(9) ? workspacePath : reader.GetString(9),
                    GitBranch = string.Empty,
                    TranscriptPath = reader.IsDBNull(10) ? string.Empty : reader.GetString(10),
                    MetadataPath = string.Empty,
                });
            }
            return results;
        }
    }

    /// <summary>Removes the session row (and via trigger, the FTS index entry).</summary>
    public bool Delete(string sessionId)
    {
        lock (_gate)
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "DELETE FROM sessions WHERE id = $id";
            cmd.Parameters.AddWithValue("$id", sessionId);
            return cmd.ExecuteNonQuery() > 0;
        }
    }

    /// <summary>Total number of session rows for the given workspace (for diagnostics).</summary>
    public int Count(string workspacePath)
    {
        lock (_gate)
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM sessions WHERE workspace_path = $workspace";
            cmd.Parameters.AddWithValue("$workspace", workspacePath);
            var result = cmd.ExecuteScalar();
            return result is long l ? (int)l : 0;
        }
    }

    private static SessionRecord? ReadRecord(SqliteDataReader r)
    {
        return new SessionRecord
        {
            SessionId = r.GetString(0),
            WorkspacePath = r.GetString(1),
            Title = r.GetString(2),
            ProviderId = r.GetString(3),
            ModelId = r.IsDBNull(4) ? null : r.GetString(4),
            Status = r.GetString(5),
            CreatedAt = DateTimeOffset.FromUnixTimeMilliseconds(r.GetInt64(6)),
            UpdatedAt = DateTimeOffset.FromUnixTimeMilliseconds(r.GetInt64(7)),
            EndedAt = r.IsDBNull(8) ? null : DateTimeOffset.FromUnixTimeMilliseconds(r.GetInt64(8)),
            MessageCount = r.GetInt32(9),
            TokenInput = r.GetInt32(10),
            TokenOutput = r.GetInt32(11),
            SizeBytes = r.GetInt32(12),
            Category = r.GetString(13),
            Mode = r.GetString(14),
            InterruptedTurnJson = r.IsDBNull(15) ? null : r.GetString(15),
            TranscriptPath = r.GetString(16),
            Summary = r.GetString(17),
        };
    }

    private static string EscapeFtsQuery(string query)
    {
        // Strip FTS5 operators from the user input, quote each token.
        var safeTokens = query
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(token => token.Replace("\"", string.Empty))
            .Where(token => !string.IsNullOrWhiteSpace(token))
            .Select(token => "\"" + token + "\"");
        return string.Join(" AND ", safeTokens);
    }

    private static DesktopMode ParseMode(string mode) =>
        Enum.TryParse<DesktopMode>(mode, ignoreCase: true, out var parsed)
            ? parsed
            : DesktopMode.Code;

    /// <summary>Closes the underlying SQLite connection.</summary>
    public void Dispose()
    {
        _connection.Dispose();
    }
}