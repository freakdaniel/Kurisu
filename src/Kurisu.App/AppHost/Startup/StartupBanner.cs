namespace Kurisu.App.AppHost.Startup;

/// <summary>
/// Prints the ASCII logo banner and hides the cursor at process start.
/// </summary>
internal static class StartupBanner
{
    private const string LogoColor = "\u001b[38;2;193;168;255m";
    private const string ResetColor = "\u001b[0m";

    private static readonly string[] Lines =
    [
        @"                                              ",
        @" __                                           ",
        @"/\ \                     __                   ",
        @"\ \ \/'\   __  __  _ __ /\_\    ____  __  __  ",
        @" \ \ , <  /\ \/\ \/\`'__\/\ \  /',__\/\ \/\ \ ",
        @"  \ \ \\`\\ \ \_\ \ \ \/ \ \ \/\__, `\ \ \_\ \",
        @"   \ \_\ \_\ \____/\ \_\  \ \_\/\____/\ \____/",
        @"    \/_/\/_/\/___/  \/_/   \/_/\/___/  \/___/ ",
    ];

    public static void Write()
    {
        Console.Clear();
        Console.CursorVisible = false;

        foreach (var line in Lines)
        {
            Console.WriteLine($"{LogoColor}{line}{ResetColor}");
        }

        Console.WriteLine();
    }
}
