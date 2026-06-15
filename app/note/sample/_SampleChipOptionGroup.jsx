'use client';

export function SampleChipOptionButtons({ options, activeValue, valueKey = 'key', onChange }) {
  return options.map(option => {
    const value = option[valueKey];
    return (
      <button
        key={value}
        className={'chip' + (activeValue === value ? ' active' : '')}
        style={{ fontSize: 11 }}
        onClick={() => onChange(value)}
      >
        {option.label}
      </button>
    );
  });
}

export function SampleChipOptionGroup({
  options,
  activeValue,
  valueKey = 'key',
  onChange,
  gap = 6,
}) {
  return (
    <div style={{ display: 'flex', gap }}>
      <SampleChipOptionButtons
        options={options}
        activeValue={activeValue}
        valueKey={valueKey}
        onChange={onChange}
      />
    </div>
  );
}
