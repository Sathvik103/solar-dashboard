import ChatInterface from './_components/ChatInterface'

export const metadata = {
  title: 'Solar AI Advisor — Solar Intelligence Platform',
  description: 'AI-powered rooftop solar planning grounded in official Telangana regulations and deterministic calculations.',
}

export default function ChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Solar Intelligence Advisor</h1>
        <p className="text-sm text-muted-foreground">
          Autonomous solar consultation with live tool execution, RAG source grounding, and formal verification.
        </p>
      </div>
      <ChatInterface />
    </div>
  )
}
