/**
 * Accent-colour swatch row used as a suffix inside an `<adw-action-row>`.
 *
 * No upstream Adwaita row type maps to "pick a colour", so this stays a
 * custom control. It's intentionally compact (20px swatches) so the row
 * height matches the surrounding switch / combo rows.
 */

const ACCENT_SWATCHES = [
  { id: 'blue', color: '#3584e4', labelKey: 'blue' },
  { id: 'green', color: '#33d17a', labelKey: 'green' },
  { id: 'teal', color: '#1abc9c', labelKey: 'teal' },
  { id: 'purple', color: '#9141ac', labelKey: 'purple' },
] as const;

export function AccentColorRow({
  value,
  onChange,
  renderSwatchLabel,
  inline = false,
}: {
  value: string;
  onChange: (next: string) => void;
  renderSwatchLabel: (id: (typeof ACCENT_SWATCHES)[number]['labelKey']) => string;
  /**
   * When true, renders as a bare suffix (no padding, no row chrome) so it
   * can sit inside an `<adw-action-row slot="suffix">`. When false,
   * renders with a built-in chrome for use as a standalone row.
   */
  inline?: boolean;
}) {
  const swatches = (
    <div
      style={{
        display: 'inline-flex',
        gap: '6px',
        alignItems: 'center',
        padding: inline ? '0' : '6px 0',
      }}
    >
      {ACCENT_SWATCHES.map((swatch) => {
        const selected = swatch.id === value;
        return (
          <button
            key={swatch.id}
            type="button"
            aria-label={renderSwatchLabel(swatch.labelKey)}
            aria-pressed={selected}
            onClick={() => onChange(swatch.id)}
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '999px',
              border: selected
                ? '2px solid currentColor'
                : '2px solid transparent',
              padding: '1px',
              background: 'transparent',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.12s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <span
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                borderRadius: '999px',
                background: swatch.color,
              }}
            />
          </button>
        );
      })}
    </div>
  );

  return swatches;
}