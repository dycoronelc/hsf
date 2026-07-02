import { CONTEXTUAL_HELP } from './content'
import type { ContextualHelpBlock, HelpPageContext } from './types'

function matchesPath(pathname: string, prefix: string): boolean {
  if (prefix === '/') return pathname === '/'
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function getContextualHelpForRoute(
  pathname: string,
  pageContext: HelpPageContext = {},
): ContextualHelpBlock[] {
  const step = pageContext.preadmissionStep

  const matched = CONTEXTUAL_HELP.filter((block) =>
    block.routePrefixes.some((prefix) => matchesPath(pathname, prefix)),
  )

  if (!pathname.startsWith('/preadmission') || step == null) {
    return matched.filter((b) => !b.preadmissionSteps?.length)
  }

  const stepSpecific = matched.filter((b) => b.preadmissionSteps?.includes(step))
  if (stepSpecific.length > 0) return stepSpecific

  return matched.filter((b) => !b.preadmissionSteps?.length)
}

export function getPrimaryContextualHelp(
  pathname: string,
  pageContext: HelpPageContext = {},
): ContextualHelpBlock | null {
  const blocks = getContextualHelpForRoute(pathname, pageContext)
  return blocks[0] ?? null
}
