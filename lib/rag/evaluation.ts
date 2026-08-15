

export type EvaluationQuery = {
  id: number
  query: string
  expectedOrganization: string
  expectedTopic: string
}

export type EvaluationResult = {
  queryId: number
  query: string
  expectedOrganization: string
  expectedTopic: string
  retrievedCount: number
  expectedSourceFound: boolean
  expectedSourceRank: number | null // 1-based rank or null if not found
  topSimilarityScore: number | null
  retrievedSources: {
    rank: number
    title: string
    organization: string
    sourceUrl: string
    similarity: number
    sectionTitle: string | null
  }[]
}

  export const TELANGANA_EVALUATION_QUERIES = [
  {
    id: 1,
    query: 'What are the rooftop solar net-metering rules in Telangana?',
    expectedOrganization: 'TGERC',
    expectedTopic: 'Net Metering Rules',
  },
  {
    id: 2,
    query: 'What rooftop solar capacities are eligible under Telangana regulations?',
    expectedOrganization: 'TGERC',
    expectedTopic: 'Capacity Eligibility',
  },
  {
    id: 3,
    query: 'What is the process for applying for rooftop solar in Telangana?',
    expectedOrganization: 'TGREDCO',
    expectedTopic: 'Application Procedure',
  },
  {
    id: 4,
    query: 'What subsidy/CFA information applies to domestic rooftop solar under PM Surya Ghar?',
    expectedOrganization: 'MNRE',
    expectedTopic: 'Central Financial Assistance Slabs',
  },
  {
    id: 5,
    query: 'What documents are required for a rooftop solar application with TSSPDCL?',
    expectedOrganization: 'TSSPDCL',
    expectedTopic: 'Required Application Documents',
  },
  {
    id: 6,
    query: 'What is the role of the DISCOM in rooftop solar approval in Telangana?',
    expectedOrganization: 'TSSPDCL',
    expectedTopic: 'Technical Feasibility and Inspection',
  },
  {
    id: 7,
    query: 'What is net metering under TGERC regulations?',
    expectedOrganization: 'TGERC',
    expectedTopic: 'Net Metering Definition',
  },
  {
    id: 8,
    query: 'What is gross metering under TGERC regulations?',
    expectedOrganization: 'TGERC',
    expectedTopic: 'Gross Metering Definition',
  },
  {
    id: 9,
    query: 'What is group/virtual net metering in Telangana?',
    expectedOrganization: 'TGERC',
    expectedTopic: 'Group and Virtual Net Metering',
  },
  {
    id: 10,
    query: 'Which authority issued the Telangana Rooftop Solar PV Grid Interactive Systems Regulations?',
    expectedOrganization: 'TGERC',
    expectedTopic: 'TGERC Regulation 1 of 2016',
  },
]

/**
 * Runs the source retrieval evaluation benchmark against the knowledge base.
 * DOES NOT CALL ANY LLM GENERATION MODEL.
 */
export async function runRetrievalEvaluation(): Promise<{
  totalQueries: number
  successRate: number
  avgTopSimilarity: number
  results: EvaluationResult[]
}> {
  const results: EvaluationResult[] = []
  let foundCount = 0
  let totalTopScoreSum = 0

  for (const evalQuery of TELANGANA_EVALUATION_QUERIES) {
    let retrieved: any[] = []
    try {
      retrieved = await searchKnowledgeBase(evalQuery.query, { topK: 5, similarityThreshold: 0.3 })
    } catch {
      retrieved = []
    }

    const retrievedSources = retrieved.map((r, index) => ({
      rank: index + 1,
      title: r.source.title,
      organization: r.source.organization,
      sourceUrl: r.source.sourceUrl,
      similarity: r.similarity,
      sectionTitle: r.sectionTitle,
    }))

    const matchIndex = retrievedSources.findIndex(
      (s) => s.organization.toLowerCase() === evalQuery.expectedOrganization.toLowerCase()
    )

    const expectedSourceFound = matchIndex !== -1
    const expectedSourceRank = matchIndex !== -1 ? matchIndex + 1 : null

    if (expectedSourceFound) foundCount++

    const topScore = retrievedSources.length > 0 ? retrievedSources[0].similarity : null
    if (topScore) totalTopScoreSum += topScore

    results.push({
      queryId: evalQuery.id,
      query: evalQuery.query,
      expectedOrganization: evalQuery.expectedOrganization,
      expectedTopic: evalQuery.expectedTopic,
      retrievedCount: retrievedSources.length,
      expectedSourceFound,
      expectedSourceRank,
      topSimilarityScore: topScore,
      retrievedSources,
    })
  }

  const totalQueries = TELANGANA_EVALUATION_QUERIES.length
  const successRate = parseFloat(((foundCount / totalQueries) * 100).toFixed(1))
  const avgTopSimilarity = parseFloat((totalTopScoreSum / (totalQueries || 1)).toFixed(4))

  return {
    totalQueries,
    successRate,
    avgTopSimilarity,
    results,
  }
}
