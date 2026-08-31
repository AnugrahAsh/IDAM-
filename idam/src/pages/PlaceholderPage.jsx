import PageBar from '../components/shell/PageBar'
import './styles/PlaceholderPage.css'
import Card from '../components/primitives/Card'
import EmptyState from '../components/primitives/EmptyState'
import Button from '../components/primitives/Button'
import { useApp } from '../store/AppContext'
import { TITLES } from '../data/nav'

export default function PlaceholderPage({ route }) {
  const { navigate } = useApp()
  return (
    <>
      <PageBar title={TITLES[route] || route} sub="This surface is being rebuilt on the new design system." />
      <Card>
        <EmptyState
          icon="layers"
          title="Screen in progress"
          body="The workbench, filters and detail panels for this area are being assembled against the upgraded design system."
          actions={<Button variant="pri" icon="dashboard" onClick={() => navigate('dashboard')}>Back to posture</Button>}
        />
      </Card>
    </>
  )
}
