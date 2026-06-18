type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder
}: SearchInputProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">
        Búsqueda rápida
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-[24px] border border-slate-200 bg-white/90 px-4 py-3.5 text-sm text-ink outline-none transition focus:border-signal focus:ring-4 focus:ring-signal/10"
      />
    </label>
  );
}
