namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Approval modes that drive the permission policy engine. Wire format
/// matches the lowercase values that appear in <c>Settings.json</c> and
/// runtime profiles.
/// </summary>
public enum ApprovalMode
{
    /// <summary>Read-only + control auto-approved; everything else asks.</summary>
    Default,
    /// <summary>Read + modify + control auto-approved; everything else asks.</summary>
    AutoEdit,
    /// <summary>All operations are auto-approved without prompts.</summary>
    Yolo,
    /// <summary>Read-only; modify, execute, automation, coordination are denied.</summary>
    Plan,
}

/// <summary>
/// String constants for the wire format of <see cref="ApprovalMode"/>,
/// plus bidirectional conversion helpers. Kept as <c>string</c> so the
/// <c>Settings.json</c> parser doesn't need a new dependency.
/// </summary>
public static class ApprovalModes
{
    /// <summary>Wire value for <see cref="ApprovalMode.Default"/>.</summary>
    public const string Default = "default";
    /// <summary>Wire value for <see cref="ApprovalMode.AutoEdit"/>.</summary>
    public const string AutoEdit = "auto-edit";
    /// <summary>Wire value for <see cref="ApprovalMode.Yolo"/>.</summary>
    public const string Yolo = "yolo";
    /// <summary>Wire value for <see cref="ApprovalMode.Plan"/>.</summary>
    public const string Plan = "plan";

    /// <summary>Parse wire-format string into ApprovalMode.</summary>
    public static ApprovalMode FromWire(string? wire) => wire?.ToLowerInvariant() switch
    {
        "yolo" => ApprovalMode.Yolo,
        "auto-edit" => ApprovalMode.AutoEdit,
        "plan" => ApprovalMode.Plan,
        _ => ApprovalMode.Default,
    };

    /// <summary>Convert to wire-format string.</summary>
    public static string ToWire(this ApprovalMode mode) => mode switch
    {
        ApprovalMode.Yolo => Yolo,
        ApprovalMode.AutoEdit => AutoEdit,
        ApprovalMode.Plan => Plan,
        _ => Default,
    };
}
