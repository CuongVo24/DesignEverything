export interface Flow {
  flow_id: string;
  steps: string[];
}

export function parseFlows(doc: string): Flow[] {
  const flows: Flow[] = [];

  const sections = [
    { name: 'typical-flow', regex: /## Luồng Điển Hình([\s\S]*?)(##|<!--|$)/i },
    { name: 'main-steps', regex: /## Các Bước Chính([\s\S]*?)(##|<!--|$)/i },
  ];

  for (const sec of sections) {
    const match = doc.match(sec.regex);
    if (match) {
      const content = match[1].trim();
      if (content.includes('->')) {
        const steps = content
          .split('->')
          .map((s) => s.replace(/^[-*+\d.\s]+/, '').trim())
          .filter(Boolean);
        if (steps.length > 0) {
          flows.push({ flow_id: sec.name, steps });
        }
      } else {
        const steps = content
          .split('\n')
          .map((s) => s.replace(/^[-*+\d.\s]+/, '').trim())
          .filter((s) => s && !s.startsWith('<!--') && !s.startsWith('{{'));
        if (steps.length > 0) {
          flows.push({ flow_id: sec.name, steps });
        }
      }
    }
  }

  return flows;
}
