import { requireUser } from '@/lib/dal/users'
import KnowledgeSearchBench from './_components/KnowledgeSearchBench'

export default async function KnowledgePage() {
  await requireUser()

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Solar Knowledge Base</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Explore and query Telangana rooftop solar regulations, policies, and subsidies with verifiable source provenance.
        </p>
      </div>

      <KnowledgeSearchBench />
    </div>
  )
}
