import { requireUser } from '@/lib/dal/users'
import { Page } from '@/components/layout/Page'
import KnowledgeSearchBench from './_components/KnowledgeSearchBench'

export const metadata = { title: 'Regulations' }

export default async function KnowledgePage() {
  await requireUser()
  return (
    <Page
      title="Regulations"
      description="Search Telangana net-metering rules, DISCOM procedures and PM Surya Ghar guidelines. Every passage links to its source document."
    >
      <KnowledgeSearchBench />
    </Page>
  )
}
