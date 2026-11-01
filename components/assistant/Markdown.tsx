'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Renders assistant answers. Raw HTML is not allowed (react-markdown escapes it by default). */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[13.5px] leading-6 text-foreground [&>*+*]:mt-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h3 className="text-sm font-semibold" {...p} />,
          h2: (p) => <h3 className="text-sm font-semibold" {...p} />,
          h3: (p) => <h4 className="text-[13px] font-semibold" {...p} />,
          h4: (p) => <h4 className="text-[13px] font-semibold" {...p} />,
          p: (p) => <p {...p} />,
          ul: (p) => <ul className="list-disc space-y-1 pl-5 marker:text-muted-foreground" {...p} />,
          ol: (p) => <ol className="list-decimal space-y-1 pl-5 marker:text-muted-foreground" {...p} />,
          strong: (p) => <strong className="font-semibold" {...p} />,
          a: ({ href, ...p }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2" {...p} />
          ),
          code: (p) => <code className="num rounded-sm bg-muted px-1 py-0.5 text-[12px]" {...p} />,
          table: (p) => (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-[12.5px]" {...p} />
            </div>
          ),
          th: (p) => <th className="border-b bg-muted/60 px-2.5 py-1.5 text-left font-medium" {...p} />,
          td: (p) => <td className="num border-b px-2.5 py-1.5 last:border-b-0" {...p} />,
          blockquote: (p) => <blockquote className="border-l-2 border-primary/50 pl-3 text-muted-foreground" {...p} />,
          hr: () => <hr className="border-border" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
