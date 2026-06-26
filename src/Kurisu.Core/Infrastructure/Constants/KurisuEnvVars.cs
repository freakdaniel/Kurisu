namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Kurisu framework environment variables. CLI-mirrors
/// the workspace path resolver and the IDE integration.
/// </summary>
public static class KurisuEnvVars
{
    /// <summary>System-wide settings.json path (overrides user/project layers).</summary>
    public const string SystemSettingsPath = "KURISU_SYSTEM_SETTINGS_PATH";
    /// <summary>System-wide defaults.json path (lowest-priority layer).</summary>
    public const string SystemDefaultsPath = "KURISU_SYSTEM_DEFAULTS_PATH";
    /// <summary>Override for the runtime output directory.</summary>
    public const string RuntimeDir = "KURISU_RUNTIME_DIR";
    /// <summary>Trusted workspace folders manifest path.</summary>
    public const string TrustedFoldersPath = "KURISU_TRUSTED_FOLDERS_PATH";
    /// <summary>Forced locale override (matches the CLI's --lang flag).</summary>
    public const string Lang = "KURISU_LANG";
    /// <summary>IDE backend server port (lock-file protocol).</summary>
    public const string IdeServerPort = "KURISU_CODE_IDE_SERVER_PORT";
    /// <summary>IDE backend stdio command (overrides lock file).</summary>
    public const string IdeServerStdioCommand = "KURISU_CODE_IDE_SERVER_STDIO_COMMAND";
    /// <summary>IDE backend stdio args (overrides lock file).</summary>
    public const string IdeServerStdioArgs = "KURISU_CODE_IDE_SERVER_STDIO_ARGS";
    /// <summary>IDE backend workspace path (overrides lock file).</summary>
    public const string IdeWorkspacePath = "KURISU_CODE_IDE_WORKSPACE_PATH";
    /// <summary>IDE backend auth token (overrides lock file).</summary>
    public const string IdeAuthToken = "KURISU_CODE_IDE_AUTH_TOKEN";
    /// <summary>Explicit workspace root override (skips marker-file discovery).</summary>
    public const string MainRoot = "KURISU_CODE_MAIN_ROOT";
    /// <summary>Substitution token replaced with the working directory in hook commands.</summary>
    public const string ProjectDirToken = "$KURISU_PROJECT_DIR";
}
