export interface ScanResult {
  detectedStack: string[]
  detectedLanguages: string[]
  importantFiles: string[]
  todoCount: number
  fixmeCount: number
  fileCount: number
}
