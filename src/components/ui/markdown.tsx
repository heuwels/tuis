"use client";

import ReactMarkdown from "react-markdown";

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className }: MarkdownProps) {
  return (
    <div
      className={`prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-a:text-blue-600 ${className || ""}`}
    >
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
