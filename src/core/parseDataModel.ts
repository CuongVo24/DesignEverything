export function parseDataModel(doc: string): { entities: string[]; relations: string[] } {
  const entities: string[] = [];
  const relations: string[] = [];

  // Parse entities under "## Thực Thể Chính"
  const entitiesSection = doc.match(/## Thực Thể Chính([\s\S]*?)(##|<!--|$)/i);
  if (entitiesSection) {
    const content = entitiesSection[1].trim();
    const lines = content.split(/[,\n]/);
    for (let line of lines) {
      line = line.replace(/^[-*+\d.\s]+/, '').trim();
      if (line && !line.startsWith('<!--') && !line.startsWith('{{')) {
        entities.push(line);
      }
    }
  }

  // Parse relations under "## Quan Hệ Giữa Các Thực Thể"
  const relationsSection = doc.match(/## Quan Hệ Giữa Các Thực Thể([\s\S]*?)(##|<!--|$)/i);
  if (relationsSection) {
    const content = relationsSection[1].trim();
    const lines = content.split(/[,\n]/);
    for (let line of lines) {
      line = line.replace(/^[-*+\d.\s]+/, '').trim();
      if (line && !line.startsWith('<!--') && !line.startsWith('{{')) {
        relations.push(line);
      }
    }
  }

  return { entities, relations };
}
