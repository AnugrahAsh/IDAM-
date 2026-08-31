export default function Select({ options = [], placeholder, className = '', ...rest }) {
  return (
    <select className={`sel ${className}`} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const value = o && o.value !== undefined ? o.value : o
        const label = o && o.label !== undefined ? o.label : o
        return <option key={value} value={value}>{label}</option>
      })}
    </select>
  )
}
