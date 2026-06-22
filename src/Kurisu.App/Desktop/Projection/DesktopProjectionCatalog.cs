using System.Globalization;
using Kurisu.Core.Models;

namespace Kurisu.App.Desktop;

internal static class DesktopProjectionCatalog
{
    internal static readonly IReadOnlyList<ResearchTrack> Tracks = [];
    internal static readonly IReadOnlyList<string> CompatibilityGoals = [];
    internal static readonly IReadOnlyList<CapabilityLane> CapabilityLanes = [];
    internal static readonly IReadOnlyList<AdoptionPattern> AdoptionPatterns = [];

    internal static readonly IReadOnlyList<LocaleOption> SupportedLocales =
    [
        new() { Code = "en", Name = "English", NativeName = "English" },
        new() { Code = "ru", Name = "Russian", NativeName = "\u0420\u0443\u0441\u0441\u043a\u0438\u0439" },
        new() { Code = "zh-CN", Name = "Chinese", NativeName = "\u7b80\u4f53\u4e2d\u6587" },
        new() { Code = "de", Name = "German", NativeName = "Deutsch" },
        new() { Code = "fr", Name = "French", NativeName = "Fran\u00e7ais" },
        new() { Code = "es", Name = "Spanish", NativeName = "Espa\u00f1ol" },
        new() { Code = "ja", Name = "Japanese", NativeName = "\u65e5\u672c\u8a9e" },
        new() { Code = "ko", Name = "Korean", NativeName = "\ud55c\uad6d\uc5b4" },
        new() { Code = "pt-BR", Name = "Portuguese (Brazil)", NativeName = "Portugu\u00eas (Brasil)" },
        new() { Code = "tr", Name = "Turkish", NativeName = "T\u00fcrk\u00e7e" },
        new() { Code = "ar", Name = "Arabic", NativeName = "\u0627\u0644\u0639\u0631\u0628\u064a\u0629" }
    ];

    /// <summary>
    /// Detects the default locale using priority: KURISU_LANG env, LANG env,
    /// system CultureInfo, then fallback to "en".
    /// </summary>
    internal static string DetectDefaultLocale(string? configDefaultLocale = null)
    {
        // 1. KURISU_LANG environment variable (highest priority, matches CLI)
        var envLang = Environment.GetEnvironmentVariable("KURISU_LANG");
        if (!string.IsNullOrWhiteSpace(envLang))
        {
            var normalized = NormalizeLocale(envLang.Trim());
            if (normalized != "en") return normalized;
        }

        // 2. LANG environment variable (common on Linux/macOS)
        var lang = Environment.GetEnvironmentVariable("LANG");
        if (!string.IsNullOrWhiteSpace(lang))
        {
            // LANG can be like "en_US.UTF-8"; extract the language part.
            var langCode = lang.Split('.', '_')[0];
            var normalized = NormalizeLocale(langCode);
            if (normalized != "en") return normalized;
        }

        // 3. System CultureInfo
        try
        {
            var culture = CultureInfo.CurrentUICulture;
            if (culture != null)
            {
                // Try full name first (e.g. "zh-CN")
                var normalized = NormalizeLocale(culture.Name);
                if (normalized != "en") return normalized;

                // Try two-letter ISO code
                normalized = NormalizeLocale(culture.TwoLetterISOLanguageName);
                if (normalized != "en") return normalized;
            }
        }
        catch
        {
            // Ignore culture access errors
        }

        // 4. Config default
        if (!string.IsNullOrWhiteSpace(configDefaultLocale))
        {
            return NormalizeLocale(configDefaultLocale);
        }

        // 5. Fallback
        return "en";
    }
    
    internal static string NormalizeLocale(string locale)
    {
        var exact = SupportedLocales.FirstOrDefault(item =>
            string.Equals(item.Code, locale, StringComparison.OrdinalIgnoreCase));
        if (exact is not null)
        {
            return exact.Code;
        }

        var language = locale.Split('-', StringSplitOptions.RemoveEmptyEntries)[0];
        var fallback = SupportedLocales.FirstOrDefault(item =>
            string.Equals(
                item.Code.Split('-', StringSplitOptions.RemoveEmptyEntries)[0],
                language,
                StringComparison.OrdinalIgnoreCase));

        return fallback?.Code ?? "en";
    }
}
