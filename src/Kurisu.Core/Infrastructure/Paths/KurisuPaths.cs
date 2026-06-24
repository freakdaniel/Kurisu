using Kurisu.Core.Models;

namespace Kurisu.Core.Infrastructure;

/// <summary>
/// Single source of truth for filesystem paths used by the Kurisu app.
/// Centralises path construction so callers never build ".kurisu/..." literals.
/// All directory names use PascalCase (e.g. <c>Channels</c>, <c>Agents</c>);
/// the dot-folder itself (<c>.kurisu</c>) and dot-prefixed filenames
/// (<c>.kurisuignore</c>, <c>.kurisu-extension-*.json</c>) remain lowercase
/// because that is their canonical identifier.
/// </summary>
public static class KurisuPaths
{
    /// <summary>Dot-folder name kept lowercase.</summary>
    public const string DotFolderName = ".kurisu";

    /// <summary>Settings file name (PascalCase).</summary>
    public const string SettingsFileName = "Settings.json";

    private const string StateFolderName = "State";
    private const string CacheFolderName = "Cache";
    private const string ModelsFolderName = "Models";
    private const string McpFolderName = "Mcp";
    private const string TokensFolderName = "Tokens";
    private const string ChannelsFolderName = "Channels";
    private const string OutboxFolderName = "Outbox";
    private const string WeixinFolderName = "Weixin";
    private const string SessionsFileName = "Sessions.json";
    private const string AccountFileName = "account.json";
    private const string IdeFolderName = "Ide";
    private const string AgentsFolderName = "Agents";
    private const string ExtensionsFolderName = "Extensions";

    /// <summary>
    /// Returns the global Kurisu directory under the user's home directory
    /// (e.g. <c>~/.kurisu</c>).
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string GlobalKurisuDirectory(string homeDirectory) =>
        Path.Combine(homeDirectory, DotFolderName);

    /// <summary>
    /// Inverse of <see cref="GlobalKurisuDirectory"/>: given the path to a
    /// <c>.kurisu</c> directory, returns the parent (home) directory.
    /// </summary>
    /// <param name="globalKurisuDirectory">Path that ends in <c>.kurisu</c>.</param>
    public static string HomeDirectoryFromGlobalKurisu(string globalKurisuDirectory) =>
        Path.GetDirectoryName(globalKurisuDirectory) ?? string.Empty;

    /// <summary>
    /// Path of the global <c>Settings.json</c> file under <c>~/.kurisu</c>.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string GlobalSettingsFile(string homeDirectory) =>
        Path.Combine(GlobalKurisuDirectory(homeDirectory), SettingsFileName);

    /// <summary>
    /// Path of the global <c>State</c> directory (used for runtime selection
    /// state, not user-visible settings).
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string StateDirectory(string homeDirectory) =>
        Path.Combine(GlobalKurisuDirectory(homeDirectory), StateFolderName);

    /// <summary>
    /// Path of the global <c>Cache</c> directory used for any kind of cached
    /// data that should survive across sessions.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string CacheDirectory(string homeDirectory) =>
        Path.Combine(GlobalKurisuDirectory(homeDirectory), CacheFolderName);

    /// <summary>
    /// Path of the cache directory that holds model lists per provider.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string ModelCacheDirectory(string homeDirectory) =>
        Path.Combine(CacheDirectory(homeDirectory), ModelsFolderName);

    /// <summary>
    /// Path of the cached model list file for a single provider.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    /// <param name="providerId">Provider id (will be sanitised).</param>
    public static string ModelCacheFile(string homeDirectory, string providerId) =>
        Path.Combine(ModelCacheDirectory(homeDirectory), $"{Sanitize(providerId)}.json");

    /// <summary>
    /// Path of the directory that stores MCP server OAuth tokens. Lives under
    /// the cache tree to make the privacy-sensitive data easy to wipe.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string McpTokenDirectory(string homeDirectory) =>
        Path.Combine(CacheDirectory(homeDirectory), McpFolderName, TokensFolderName);

    /// <summary>
    /// Path of the persisted OAuth/pat token file for an MCP server.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    /// <param name="serverName">MCP server name (will be sanitised).</param>
    public static string McpTokenFile(string homeDirectory, string serverName) =>
        Path.Combine(McpTokenDirectory(homeDirectory), $"{Sanitize(serverName)}.json");

    /// <summary>
    /// Path of the channel configuration directory.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string ChannelsDirectory(string homeDirectory) =>
        Path.Combine(GlobalKurisuDirectory(homeDirectory), ChannelsFolderName);

    /// <summary>
    /// Path of the directory where pending channel deliveries are spooled.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string ChannelOutboxDirectory(string homeDirectory) =>
        Path.Combine(ChannelsDirectory(homeDirectory), OutboxFolderName);

    /// <summary>
    /// Path of the WeChat channel configuration directory.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string ChannelWeixinDirectory(string homeDirectory) =>
        Path.Combine(ChannelsDirectory(homeDirectory), WeixinFolderName);

    /// <summary>
    /// Path of the WeChat channel account configuration file.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string ChannelWeixinAccountFile(string homeDirectory) =>
        Path.Combine(ChannelWeixinDirectory(homeDirectory), AccountFileName);

    /// <summary>
    /// Path of the file that holds the runtime map of channels to sessions.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string ChannelSessionsFile(string homeDirectory) =>
        Path.Combine(ChannelsDirectory(homeDirectory), SessionsFileName);

    /// <summary>
    /// Path of the IDE companion working directory under <c>~/.kurisu</c>.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string IdeDirectory(string homeDirectory) =>
        Path.Combine(GlobalKurisuDirectory(homeDirectory), IdeFolderName);

    /// <summary>
    /// Path of the lock file the IDE companion creates for a specific port.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    /// <param name="port">The IDE companion port (serialised verbatim).</param>
    public static string IdePortLockFile(string homeDirectory, string port) =>
        Path.Combine(IdeDirectory(homeDirectory), $"{port}.lock");

    /// <summary>
    /// Path of the global agent definitions directory.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string AgentsDirectory(string homeDirectory) =>
        Path.Combine(GlobalKurisuDirectory(homeDirectory), AgentsFolderName);

    /// <summary>
    /// Path of the project-level <c>.kurisu</c> directory.
    /// </summary>
    /// <param name="projectRoot">The project root directory.</param>
    public static string ProjectKurisuDirectory(string projectRoot) =>
        Path.Combine(projectRoot, DotFolderName);

    /// <summary>
    /// Path of the project-level <c>Settings.json</c> file.
    /// </summary>
    /// <param name="projectRoot">The project root directory.</param>
    public static string ProjectSettingsFile(string projectRoot) =>
        Path.Combine(ProjectKurisuDirectory(projectRoot), SettingsFileName);

    /// <summary>
    /// Path of the project-level agent definitions directory.
    /// </summary>
    /// <param name="projectRoot">The project root directory.</param>
    public static string ProjectAgentsDirectory(string projectRoot) =>
        Path.Combine(ProjectKurisuDirectory(projectRoot), AgentsFolderName);

    /// <summary>
    /// Path of the project-level extensions directory.
    /// </summary>
    /// <param name="projectRoot">The project root directory.</param>
    public static string ProjectExtensionsDirectory(string projectRoot) =>
        Path.Combine(ProjectKurisuDirectory(projectRoot), ExtensionsFolderName);

    /// <summary>
    /// Path of the per-project runtime tree (Projects/&lt;hash&gt;).
    /// </summary>
    /// <param name="runtimeBase">Resolved runtime base directory.</param>
    public static string ProjectsRuntimeDirectory(string runtimeBase) =>
        Path.Combine(runtimeBase, "Projects");

    /// <summary>
    /// Path of the history directory under the runtime base.
    /// </summary>
    /// <param name="runtimeBase">Resolved runtime base directory.</param>
    public static string HistoryRuntimeDirectory(string runtimeBase) =>
        Path.Combine(runtimeBase, "history");

    /// <summary>
    /// Path of the directory that stores per-session JSONL transcripts.
    /// </summary>
    /// <param name="projectDataDirectory">The project data directory (Projects/&lt;hash&gt;).</param>
    public static string ChatsDirectory(string projectDataDirectory) =>
        Path.Combine(projectDataDirectory, "Chats");

    /// <summary>
    /// Path of the JSONL transcript for a single session.
    /// </summary>
    /// <param name="profile">Runtime profile that supplies the chats directory.</param>
    /// <param name="sessionId">The session id.</param>
    public static string SessionTranscriptFile(KurisuRuntimeProfile profile, string sessionId) =>
        Path.Combine(profile.ChatsDirectory, $"{sessionId}.jsonl");

    /// <summary>
    /// Path of the persisted interrupted-turn marker for a single session.
    /// </summary>
    /// <param name="profile">Runtime profile that supplies the chats directory.</param>
    /// <param name="sessionId">The session id.</param>
    public static string InterruptedTurnFile(KurisuRuntimeProfile profile, string sessionId) =>
        Path.Combine(profile.ChatsDirectory, $"{sessionId}.interrupted.json");

    /// <summary>
    /// Path of the SQLite metadata database for sessions.
    /// </summary>
    /// <param name="profile">Runtime profile that supplies the project data directory.</param>
    public static string SessionsDbPath(KurisuRuntimeProfile profile) =>
        Path.Combine(profile.ProjectDataDirectory, "Sessions.db");

    /// <summary>
    /// Path of the SQLite vector (sqlite-vec) database for session embeddings.
    /// </summary>
    /// <param name="profile">Runtime profile that supplies the project data directory.</param>
    public static string VectorsDbPath(KurisuRuntimeProfile profile) =>
        Path.Combine(profile.ProjectDataDirectory, "Vectors.db");

    /// <summary>
    /// Path of the runtime selection file (auth type, model, embedding model).
    /// Stored separately from settings because these are runtime state, not
    /// user preferences.
    /// </summary>
    /// <param name="homeDirectory">The user home directory.</param>
    public static string SelectionFile(string homeDirectory) =>
        Path.Combine(StateDirectory(homeDirectory), "Selection.json");

    /// <summary>
    /// Replaces path separators and characters that are illegal in file
    /// names with underscores so that provider ids and server names can be
    /// used as filename components safely.
    /// </summary>
    /// <param name="name">Arbitrary identifier to sanitise.</param>
    public static string Sanitize(string name)
    {
        if (string.IsNullOrEmpty(name)) return "_";
        var invalid = Path.GetInvalidFileNameChars();
        var chars = name.Select(c => invalid.Contains(c) || c == '/' || c == '\\' ? '_' : c).ToArray();
        return new string(chars);
    }
}