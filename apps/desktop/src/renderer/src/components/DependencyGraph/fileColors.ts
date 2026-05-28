const EXT_COLORS: Record<string, string> = {
  ts: '#3178C6', tsx: '#3178C6',
  js: '#F0DB4F', jsx: '#61DAFB', mjs: '#F0DB4F',
  py: '#3572A5', rb: '#CC342D', go: '#00ADD8',
  rs: '#DEA584', cs: '#A97BFF', java: '#B07219',
  css: '#563D7C', scss: '#CC6699', less: '#1D365D',
  vue: '#42B883', svelte: '#FF3E00',
  json: '#89D185', md: '#636363',
  html: '#E34C26', sh: '#4EAA25',
  yml: '#CB171E', yaml: '#CB171E',
  dart: '#0175C2', kt: '#A97BFF', swift: '#F05138',
  cpp: '#F34B7D', c: '#555555', php: '#4F5D95',
  sql: '#E38C00',
}

export function getExtColor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  return EXT_COLORS[ext] ?? '#8B8B8B'
}
