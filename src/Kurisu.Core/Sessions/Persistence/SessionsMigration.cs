using Kurisu.Core.Config;
using Kurisu.Core.Infrastructure;
using Kurisu.Core.Sessions.Memory;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Kurisu.Core.Sessions.Persistence;

/// <summary>
/// One-time migration that walks existing JSONL transcripts under
/// <see cref="KurisuPaths.ChatsDirectory"/>, registers them in
/// <see cref="SessionsDb"/>, and (optionally) re-indexes them in
/// <see cref="VectorsDb"/> via <see cref="EmbeddingIndexer"/>. Runs at
/// startup as a hosted service; safe to invoke repeatedly (idempotent).
/// </summary>
public sealed class SessionsMigration
{
    private readonly SessionsDb _sessions;
    private readonly EmbeddingIndexer? _embedder;

    /// <summary>
    /// Creates the migration. <paramref name="embedder"/> may be null to skip
    /// the vector-indexing pass (only metadata will be migrated).
    /// </summary>
    public SessionsMigration(SessionsDb sessions, EmbeddingIndexer? embedder = null)
    {
        _sessions = sessions;
        _embedder = embedder;
    }

    /// <summary>
    /// Walks the chats directory for the given runtime profile and registers
    /// any transcript files that are missing from the metadata database.
    /// </summary>
    public async Task RunAsync(KurisuRuntimeProfile profile, CancellationToken ct = default)
    {
        if (!Directory.Exists(profile.ChatsDirectory))
        {
            return;
        }

        var files = Directory.EnumerateFiles(profile.ChatsDirectory, "*.jsonl").ToArray();
        if (files.Length == 0) return;

        var pending = new List<string>();
        foreach (var file in files)
        {
            var id = Path.GetFileNameWithoutExtension(file);
            if (_sessions.Get(id) is null)
            {
                pending.Add(id);
            }
        }

        if (pending.Count == 0)
        {
            return;
        }

        if (_embedder is not null)
        {
            foreach (var id in pending)
            {
                try
                {
                    await _embedder.IndexSessionAsync(profile, id, ct).ConfigureAwait(false);
                }
                catch (Exception)
                {
                    // Best-effort: embedder may fail if no api key is configured yet.
                }
            }
        }
        else
        {
            foreach (var id in pending)
            {
                _sessions.Upsert(BuildMetadataOnlyRecord(profile, id));
            }
        }
    }

    private static SessionRecord BuildMetadataOnlyRecord(KurisuRuntimeProfile profile, string sessionId)
    {
        var path = KurisuPaths.SessionTranscriptFile(profile, sessionId);
        var info = new FileInfo(path);
        return new SessionRecord
        {
            SessionId = sessionId,
            WorkspacePath = profile.ProjectRoot,
            Title = "(migrated session)",
            ProviderId = string.Empty,
            ModelId = null,
            Status = "completed",
            CreatedAt = info.CreationTimeUtc,
            UpdatedAt = info.LastWriteTimeUtc,
            EndedAt = info.LastWriteTimeUtc,
            MessageCount = 0,
            TokenInput = 0,
            TokenOutput = 0,
            SizeBytes = (int)info.Length,
            Category = "coder",
            Mode = "desktop",
            InterruptedTurnJson = null,
            TranscriptPath = path,
            Summary = string.Empty,
        };
    }
}

/// <summary>
/// Runs <see cref="SessionsMigration"/> once at startup. Skips itself in
/// short-lived processes (tests) by guarding on the existence of the chats
/// directory.
/// </summary>
/// <summary>
/// Runs <see cref="SessionsMigration"/> once at startup. Skips itself in
/// short-lived processes (tests) by guarding on the existence of the chats
/// directory.
/// </summary>
public sealed class SessionsMigrationHostedService : IHostedService
{
    private readonly SessionsMigration _migration;
    private readonly KurisuRuntimeProfileService _profileService;
    private readonly ILogger<SessionsMigrationHostedService> _logger;

    /// <summary>
    /// Wires the hosted service with its migration collaborator and runtime
    /// profile service.
    /// </summary>
    public SessionsMigrationHostedService(
        SessionsMigration migration,
        KurisuRuntimeProfileService profileService,
        ILogger<SessionsMigrationHostedService> logger)
    {
        _migration = migration;
        _profileService = profileService;
        _logger = logger;
    }

    /// <summary>Runs the migration against the current workspace.</summary>
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            var cwd = Environment.CurrentDirectory;
            var profile = _profileService.Inspect(new Models.WorkspacePaths { WorkspaceRoot = cwd });
            await _migration.RunAsync(profile, cancellationToken).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Sessions migration failed; continuing startup.");
        }
    }

    /// <summary>No-op: migration is a one-shot.</summary>
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}