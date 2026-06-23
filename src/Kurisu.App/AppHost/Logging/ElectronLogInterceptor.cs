using System.Text;
using Serilog;

namespace Kurisu.App.AppHost.Logging;

/// <summary>
/// Forwards lines written to a redirected <see cref="Console"/> stream
/// into Serilog so Electron.NET's Node-side bridge output ends up in the
/// rolling log file alongside the managed code's events.
/// </summary>
internal sealed class ElectronLogInterceptor : TextWriter
{
    private static readonly string[] NoisePatterns =
    [
        "GatherBuildInfo",
        "Probe scored",
        "testhost detected",
        "StartupMethod",
        "UnpackedDotnetFirst",
        "launch origin",
        "package mode",
        "isUnPacked",
        "electronBinaryName",
        "[StartCore]",
        "[StartInternal]",
        "Before Start",
        "after run",
        "startCmd",
        "Electron Socket:",
        "loading components",
        "startup complete",
        "dynamic IO Port",
        "BridgeConnector",
        "GetVSyncParametersIfAvailable",
        "Passthrough is not supported",
        "viz.mojom.Compositor",
        "gpu_channel_manager",
        "sandboxed_process_launcher",
        "Fontconfig error",
        "Mesa warning",
        "MESA-LOADER",
        "libEGL warning",
        "DRI driver"
    ];

    private static readonly string[] WarningPatterns =
    [
        "ERROR:", "FATAL:", "Uncaught Exception", "(electron) Helper",
        "stack trace:", "crash"
    ];

    private readonly TextWriter _original;
    private readonly bool _isError;
    private readonly StringBuilder _buffer = new();

    public ElectronLogInterceptor(TextWriter original, bool isError)
    {
        _original = original;
        _isError = isError;
    }

    public override Encoding Encoding => _original.Encoding;

    public override void Write(char value)
    {
        if (value == '\n')
            FlushLine();
        else
            _buffer.Append(value);
    }

    public override void Write(string? value)
    {
        if (string.IsNullOrEmpty(value))
            return;

        foreach (var ch in value)
            Write(ch);
    }

    public override void WriteLine(string? value)
    {
        Write(value);
        FlushLine();
    }

    public override void Flush() => FlushLine();

    protected override void Dispose(bool disposing)
    {
        FlushLine();
        base.Dispose(disposing);
    }

    private void FlushLine()
    {
        var line = _buffer.ToString().TrimEnd('\r');
        _buffer.Clear();

        if (line.Length == 0)
            return;

        if (line.StartsWith("|| ", StringComparison.Ordinal))
            line = line[3..];

        if (line.Length == 0)
            return;

        if (ContainsAny(line, NoisePatterns))
            return;

        var isWarning = _isError || ContainsAny(line, WarningPatterns);
        if (isWarning)
            Log.Logger.Warning("{Line}", line);
        else
            Log.Logger.Information("{Line}", line);
    }

    private static bool ContainsAny(string line, string[] patterns)
    {
        foreach (var pattern in patterns)
            if (line.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                return true;

        return false;
    }
}
