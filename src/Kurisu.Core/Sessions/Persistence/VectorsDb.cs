using System.Buffers.Binary;
using Microsoft.Data.Sqlite;

namespace Kurisu.Core.Sessions.Persistence;

/// <summary>
/// One chunk of a session embedded for retrieval. A long transcript is split
/// into multiple chunks; each becomes one row in the vector table.
/// </summary>
/// <param name="SessionId">Session this chunk belongs to.</param>
/// <param name="ChunkIndex">0-based ordering within the session.</param>
/// <param name="Excerpt">Plain text used as retrieval context (caller renders this when showing matches).</param>
/// <param name="Embedding">Float vector (typically 1536 dims for <c>text-embedding-v4</c>).</param>
/// <param name="ModelId">Embedding model id; lets us invalidate the index if the model changes.</param>
public sealed record EmbeddingChunk(
    string SessionId,
    int ChunkIndex,
    string Excerpt,
    float[] Embedding,
    string ModelId);

/// <summary>
/// One hit from a vector similarity search.
/// </summary>
/// <param name="SessionId">The session the match came from.</param>
/// <param name="ChunkIndex">Position within the session.</param>
/// <param name="Excerpt">Text of the matching chunk.</param>
/// <param name="Distance">Cosine distance reported by sqlite-vec (lower = better).</param>
public sealed record SimilarChunk(
    string SessionId,
    int ChunkIndex,
    string Excerpt,
    float Distance);

/// <summary>
/// Stores session embeddings in a SQLite database with the <c>sqlite-vec</c>
/// extension. One row per chunk; a single session typically has several chunks.
/// </summary>
public sealed class VectorsDb : IDisposable
{
    private readonly int _dimensions;
    private readonly string _dbPath;
    private readonly SqliteConnection _connection;
    private readonly object _gate = new();

    /// <summary>
    /// Opens or creates the database at <paramref name="dbPath"/> with a vector
    /// column of <paramref name="dimensions"/> floats (matches the embedding
    /// model output size).
    /// </summary>
    public VectorsDb(string dbPath, int dimensions)
    {
        if (dimensions <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(dimensions), "Embedding dimensions must be positive.");
        }
        _dbPath = dbPath;
        _dimensions = dimensions;
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

    /// <summary>Vector column dimensionality.</summary>
    public int Dimensions => _dimensions;

    /// <summary>
    /// Creates the vector virtual table if it does not exist and stores the
    /// embedding model id in a small metadata table.
    /// </summary>
    public void EnsureSchema()
    {
        using var cmd = _connection.CreateCommand();
        cmd.CommandText = $@"
            CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(
                embedding float[{_dimensions}]
            );

            CREATE TABLE IF NOT EXISTS vec_chunks_meta (
                rowid       INTEGER PRIMARY KEY,
                session_id  TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                excerpt     TEXT NOT NULL,
                model_id    TEXT NOT NULL,
                embedded_at INTEGER NOT NULL,
                UNIQUE(session_id, chunk_index)
            );

            CREATE INDEX IF NOT EXISTS idx_vec_meta_session
                ON vec_chunks_meta(session_id);
        ";
        cmd.ExecuteNonQuery();

        using var pragma = _connection.CreateCommand();
        pragma.CommandText = "PRAGMA journal_mode = WAL;";
        pragma.ExecuteNonQuery();
    }

    /// <summary>
    /// Inserts or replaces all chunks for the given session in a single
    /// transaction. Old chunks for the session are deleted first so the index
    /// never grows stale.
    /// </summary>
    public void UpsertSessionChunks(string sessionId, IReadOnlyList<EmbeddingChunk> chunks)
    {
        if (chunks.Count == 0) return;

        lock (_gate)
        {
            using var tx = _connection.BeginTransaction();

            using (var del = _connection.CreateCommand())
            {
                del.Transaction = tx;
                del.CommandText = @"
                    DELETE FROM vec_chunks_meta WHERE session_id = $sid;
                    DELETE FROM vec_chunks WHERE rowid IN (
                        SELECT rowid FROM vec_chunks_meta WHERE session_id = $sid
                    );";
                del.Parameters.AddWithValue("$sid", sessionId);
                del.ExecuteNonQuery();
            }

            foreach (var chunk in chunks)
            {
                if (chunk.Embedding.Length != _dimensions)
                {
                    throw new ArgumentException(
                        $"Chunk embedding has {chunk.Embedding.Length} dimensions; expected {_dimensions}.",
                        nameof(chunks));
                }

                long rowid;
                using (var insMeta = _connection.CreateCommand())
                {
                    insMeta.Transaction = tx;
                    insMeta.CommandText = @"
                        INSERT INTO vec_chunks_meta (session_id, chunk_index, excerpt, model_id, embedded_at)
                        VALUES ($sid, $idx, $excerpt, $model, $at);
                        SELECT last_insert_rowid();";
                    insMeta.Parameters.AddWithValue("$sid", chunk.SessionId);
                    insMeta.Parameters.AddWithValue("$idx", chunk.ChunkIndex);
                    insMeta.Parameters.AddWithValue("$excerpt", chunk.Excerpt);
                    insMeta.Parameters.AddWithValue("$model", chunk.ModelId);
                    insMeta.Parameters.AddWithValue("$at", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
                    rowid = (long)insMeta.ExecuteScalar()!;
                }

                using (var insVec = _connection.CreateCommand())
                {
                    insVec.Transaction = tx;
                    insVec.CommandText = "INSERT INTO vec_chunks(rowid, embedding) VALUES ($rid, $vec);";
                    insVec.Parameters.AddWithValue("$rid", rowid);
                    insVec.Parameters.AddWithValue("$vec", SerializeFloats(chunk.Embedding));
                    insVec.ExecuteNonQuery();
                }
            }

            tx.Commit();
        }
    }

    /// <summary>
    /// Removes all chunks for the given session.
    /// </summary>
    public void DeleteSession(string sessionId)
    {
        lock (_gate)
        {
            using var tx = _connection.BeginTransaction();

            using (var getRows = _connection.CreateCommand())
            {
                getRows.Transaction = tx;
                getRows.CommandText = "SELECT rowid FROM vec_chunks_meta WHERE session_id = $sid";
                getRows.Parameters.AddWithValue("$sid", sessionId);
                var rowids = new List<long>();
                using var reader = getRows.ExecuteReader();
                while (reader.Read())
                {
                    rowids.Add(reader.GetInt64(0));
                }

                foreach (var rid in rowids)
                {
                    using var del = _connection.CreateCommand();
                    del.Transaction = tx;
                    del.CommandText = "DELETE FROM vec_chunks WHERE rowid = $rid";
                    del.Parameters.AddWithValue("$rid", rid);
                    del.ExecuteNonQuery();
                }
            }

            using (var delMeta = _connection.CreateCommand())
            {
                delMeta.Transaction = tx;
                delMeta.CommandText = "DELETE FROM vec_chunks_meta WHERE session_id = $sid";
                delMeta.Parameters.AddWithValue("$sid", sessionId);
                delMeta.ExecuteNonQuery();
            }

            tx.Commit();
        }
    }

    /// <summary>
    /// Returns the top-<paramref name="topK"/> chunks most similar to
    /// <paramref name="queryEmbedding"/>, ordered by cosine distance ascending.
    /// </summary>
    public IReadOnlyList<SimilarChunk> Search(float[] queryEmbedding, int topK)
    {
        if (topK <= 0) topK = 5;
        if (queryEmbedding.Length != _dimensions)
        {
            throw new ArgumentException(
                $"Query embedding has {queryEmbedding.Length} dimensions; expected {_dimensions}.",
                nameof(queryEmbedding));
        }

        lock (_gate)
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = @"
                SELECT v.rowid, m.session_id, m.chunk_index, m.excerpt, v.distance
                FROM vec_chunks v
                JOIN vec_chunks_meta m ON m.rowid = v.rowid
                WHERE v.embedding MATCH $vec
                ORDER BY v.distance
                LIMIT $k";
            cmd.Parameters.AddWithValue("$vec", SerializeFloats(queryEmbedding));
            cmd.Parameters.AddWithValue("$k", topK);

            var results = new List<SimilarChunk>(topK);
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                results.Add(new SimilarChunk(
                    SessionId: reader.GetString(1),
                    ChunkIndex: reader.GetInt32(2),
                    Excerpt: reader.GetString(3),
                    Distance: reader.GetFloat(4)));
            }
            return results;
        }
    }

    /// <summary>Number of chunks in the database (for diagnostics).</summary>
    public int ChunkCount()
    {
        lock (_gate)
        {
            using var cmd = _connection.CreateCommand();
            cmd.CommandText = "SELECT COUNT(*) FROM vec_chunks_meta";
            return Convert.ToInt32(cmd.ExecuteScalar());
        }
    }

    private static byte[] SerializeFloats(float[] values)
    {
        var buffer = new byte[values.Length * sizeof(float)];
        var span = buffer.AsSpan();
        for (var i = 0; i < values.Length; i++)
        {
            BinaryPrimitives.WriteSingleLittleEndian(span.Slice(i * sizeof(float), sizeof(float)), values[i]);
        }
        return buffer;
    }

    /// <summary>Closes the underlying SQLite connection.</summary>
    public void Dispose()
    {
        _connection.Dispose();
    }
}