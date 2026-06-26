namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Wire-format status strings for tool execution results. The
/// <c>NativeToolExecutionResult.Status</c> field uses these values.
/// </summary>
public static class ToolExecutionStatus
{
    /// <summary>Tool completed without further action needed.</summary>
    public const string Completed = "completed";
    /// <summary>Tool requires user approval before it can run.</summary>
    public const string ApprovalRequired = "approval-required";
    /// <summary>Tool was blocked by the permission policy.</summary>
    public const string Blocked = "blocked";
    /// <summary>Tool failed at runtime.</summary>
    public const string Error = "error";
    /// <summary>Tool was cancelled by the user.</summary>
    public const string Cancelled = "cancelled";
}
