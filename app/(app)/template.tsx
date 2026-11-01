/** Re-mounts on every navigation, giving each page a short entrance. */
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-in-up">{children}</div>
}
