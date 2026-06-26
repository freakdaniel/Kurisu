namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Per-folder trust values used by the workspace trust model.
/// </summary>
public static class WorkspaceTrustValue
{
    /// <summary>Trust this folder only.</summary>
    public const string TrustFolder = "TRUST_FOLDER";
    /// <summary>Trust this folder's parent directory tree.</summary>
    public const string TrustParent = "TRUST_PARENT";
    /// <summary>Do not trust this folder — refuse to operate inside it.</summary>
    public const string DoNotTrust = "DO_NOT_TRUST";
}
