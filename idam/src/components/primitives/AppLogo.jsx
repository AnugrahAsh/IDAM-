import { BRAND_MARKS } from '../../data/brandMarks'
import aws from '../../assets/logos/aws.svg'
import azure from '../../assets/logos/azure.svg'
import gcp from '../../assets/logos/gcp.svg'
import github from '../../assets/logos/github.svg'
import microsoft from '../../assets/logos/microsoft.svg'
import mssql from '../../assets/logos/mssql.svg'
import oracle from '../../assets/logos/oracle.svg'
import salesforce from '../../assets/logos/salesforce.svg'
import sap from '../../assets/logos/sap.svg'
import servicenow from '../../assets/logos/servicenow.svg'
import splunk from '../../assets/logos/splunk.svg'
import tableau from '../../assets/logos/tableau.svg'
import workday from '../../assets/logos/workday.svg'

const FILE_LOGOS = {
  aws, azure, gcp, github, microsoft, mssql, oracle,
  salesforce, sap, servicenow, splunk, tableau, workday,
}

const FALLBACK_TINT = ['#0F62FE', '#6941C6', '#0E7D74', '#B25E09', '#C2255C', '#1F7A3D', '#0B65B8', '#8A5A00']

export default function AppLogo({ brand, name = '', size = 34, rounded = true }) {
  const key = brand || name.toLowerCase().replace(/[^a-z0-9]/g, '')
  const file = FILE_LOGOS[key]
  const mark = BRAND_MARKS[key]

  if (file) {
    return (
      <span className="applogo" data-rounded={rounded || undefined} style={{ width: size, height: size }}>
        <img src={file} alt="" width={size} height={size} loading="lazy" />
      </span>
    )
  }

  if (mark) {
    return (
      <span className="applogo" data-rounded={rounded || undefined} style={{ width: size, height: size }}>
        <span className="applogo-svg" style={{ width: size, height: size }}>{mark}</span>
      </span>
    )
  }

  const seed = [...key].reduce((a, c) => a + c.charCodeAt(0), 0)
  const tint = FALLBACK_TINT[seed % FALLBACK_TINT.length]
  const initials = name.split(/[\s·-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

  return (
    <span
      className="applogo applogo-fallback"
      data-rounded={rounded || undefined}
      style={{ width: size, height: size, background: tint, fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  )
}
