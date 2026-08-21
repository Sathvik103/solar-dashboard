import ChatInterface from '../_components/ChatInterface'

export default async function ConversationPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Solar Intelligence Advisor</h1>
        <p className="text-sm text-muted-foreground">
          Autonomous solar consultation with live tool execution, RAG source grounding, and formal verification.
        </p>
      </div>
      <ChatInterface initialConversationId={params.id} />
    </div>
  )
}
