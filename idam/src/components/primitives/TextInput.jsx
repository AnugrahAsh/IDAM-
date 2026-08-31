export default function TextInput({ as = 'input', className = '', ...rest }) {
  const Tag = as
  return <Tag className={`inp ${className}`} {...rest} />
}
