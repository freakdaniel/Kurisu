using Serilog.Core;
using Serilog.Events;
using Serilog.Formatting.Display;

namespace Kurisu.App.AppHost.Logging;

/// <summary>
/// Minimal Serilog sink that writes formatted events to a caller-owned
/// <see cref="TextWriter"/> with ANSI color codes for the log level.
/// </summary>
internal sealed class AnsiConsoleSink : ILogEventSink
{
    private const string Reset = "\u001b[0m";
    private const string Dim = "\u001b[38;5;244m";

    private static readonly Dictionary<LogEventLevel, string> LevelColors = new()
    {
        [LogEventLevel.Verbose] = "\u001b[38;5;244m",
        [LogEventLevel.Debug] = "\u001b[38;5;244m",
        [LogEventLevel.Information] = "\u001b[38;5;39m",
        [LogEventLevel.Warning] = "\u001b[38;5;214m",
        [LogEventLevel.Error] = "\u001b[38;5;196m",
        [LogEventLevel.Fatal] = "\u001b[38;5;201m"
    };

    private readonly TextWriter _writer;
    private readonly MessageTemplateTextFormatter _formatter;

    public AnsiConsoleSink(TextWriter writer)
    {
        _writer = writer;
        _formatter = new MessageTemplateTextFormatter("{Message:lj}{NewLine}{Exception}");
    }

    public void Emit(LogEvent logEvent)
    {
        using var buffer = new StringWriter();
        _formatter.Format(logEvent, buffer);
        var body = buffer.ToString().TrimEnd('\r', '\n');

        var level = logEvent.Level.ToString().ToUpperInvariant();
        var color = LevelColors.TryGetValue(logEvent.Level, out var c) ? c : "";
        var levelText = $"{color}{level,-3}{Reset}";

        _writer.Write(Dim);
        _writer.Write(logEvent.Timestamp.ToString("HH:mm:ss"));
        _writer.Write(Reset);
        _writer.Write(' ');
        _writer.Write(levelText);
        _writer.Write(' ');
        _writer.WriteLine(body);
        _writer.Flush();
    }
}
