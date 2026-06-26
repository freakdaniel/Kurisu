namespace Kurisu.Core.Infrastructure.Constants;

/// <summary>
/// Names of built-in tools that have a stable contract with the model
/// layer. New tools can be added freely; these are the well-known ones
/// referenced by the policy engine, the agent arena, and the system
/// prompt section registry.
/// </summary>
public static class WellKnownToolNames
{
    /// <summary>Tool that exits the planning phase and resumes execution.</summary>
    public const string ExitPlanMode = "exit_plan_mode";
    /// <summary>Edit an existing file in place.</summary>
    public const string Edit = "edit";
    /// <summary>Write a new file or overwrite an existing one.</summary>
    public const string WriteFile = "write_file";
    /// <summary>Read a file from disk.</summary>
    public const string Read = "read";
    /// <summary>Generic write operation (alias).</summary>
    public const string Write = "write";
    /// <summary>Run a shell command.</summary>
    public const string RunShellCommand = "run_shell_command";
    /// <summary>Search the web (Tavily / Google).</summary>
    public const string WebSearch = "web_search";
    /// <summary>Fetch a specific URL.</summary>
    public const string WebFetch = "web_fetch";
    /// <summary>Read project memory.</summary>
    public const string Memory = "memory";
    /// <summary>Write to project memory.</summary>
    public const string MemoryWrite = "memory_write";
    /// <summary>Load a skill from the skills directory.</summary>
    public const string Skill = "skill";
    /// <summary>Ask the user a multi-choice question.</summary>
    public const string AskUserQuestion = "ask_user_question";
    /// <summary>Write to the in-session todo list.</summary>
    public const string TodoWrite = "todo_write";
    /// <summary>Background async task.</summary>
    public const string Task = "task";
    /// <summary>Scheduled task.</summary>
    public const string Cron = "cron";
}
