import type { GenerateAdResponse } from '@/types'

export type KimiParsedAdResponse = Omit<GenerateAdResponse, 'sessionId' | 'sessionIdB'>

export function parseKimiJsonResponse(content: string): KimiParsedAdResponse {
  const jsonText = extractJsonObject(content)

  try {
    return JSON.parse(jsonText) as KimiParsedAdResponse
  } catch (firstError) {
    const repaired = repairCommonKimiJson(jsonText)
    try {
      return JSON.parse(repaired) as KimiParsedAdResponse
    } catch (secondError) {
      const originalMessage = firstError instanceof Error ? firstError.message : String(firstError)
      const repairedMessage = secondError instanceof Error ? secondError.message : String(secondError)
      throw new Error(
        `Failed to parse Kimi response as JSON. original=${originalMessage}; repaired=${repairedMessage}; content=${content.slice(0, 500)}`
      )
    }
  }
}

function extractJsonObject(content: string): string {
  const start = content.indexOf('{')
  const end = content.lastIndexOf('}')

  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Failed to parse Kimi response: ${content.slice(0, 200)}`)
  }

  return content.slice(start, end + 1)
}

function repairCommonKimiJson(jsonText: string): string {
  return jsonText
    .replace(/```(?:json)?/gi, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([\[{,]\s*)([A-Za-z_$][\w$]*)\s*:/g, '$1"$2":')
}
