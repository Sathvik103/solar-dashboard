export default function AuthFrame({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-[380px]">
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-[13.5px] text-muted-foreground">{description}</p>
        <div className="mt-6 rounded-lg border bg-card p-6">{children}</div>
      </div>
    </div>
  )
}
