namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Tags the permission policy engine uses to classify tools into risk
/// buckets. Wire format is preserved as <c>string</c>.
/// </summary>
public static class ToolKind
{
    /// <summary>Read-only operation (file read, search, etc.).</summary>
    public const string Read = "read";
    /// <summary>Mutating operation that doesn't execute code (file write, edit).</summary>
    public const string Modify = "modify";
    /// <summary>Process control (kill, signal, permission flip).</summary>
    public const string Control = "control";
    /// <summary>Execution of arbitrary code (shell, python, etc.).</summary>
    public const string Execute = "execute";
    /// <summary>Scheduled / background automation (cron, task).</summary>
    public const string Automation = "automation";
    /// <summary>Multi-agent coordination (arena, subagent spawn).</summary>
    public const string Coordination = "coordination";
}
