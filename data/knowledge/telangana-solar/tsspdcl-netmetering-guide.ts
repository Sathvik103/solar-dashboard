import type { IngestDocumentInput } from '@/lib/rag/ingestion'

export const tsspdclGuide: IngestDocumentInput = {
  title: 'TSSPDCL Net Metering Consumer Guide & Solar Feasibility Process',
  source: 'Telangana State Southern Power Distribution Company Limited (TSSPDCL)',
  sourceUrl: 'https://www.tssouthernpower.com/RooftopSolarNetMeteringProcedure.pdf',
  organization: 'TSSPDCL',
  documentType: 'Consumer Procedure Guide',
  locationScope: 'Telangana',
  publicationDate: '2022-04-15',
  effectiveDate: '2022-04-15',
  version: 'v1.3',
  status: 'published',
  content: `
--- Page 1 ---
TELANGANA STATE SOUTHERN POWER DISTRIBUTION COMPANY LIMITED (TSSPDCL)
CORPORATE OFFICE, HYDERABAD

CONSUMER GUIDELINES FOR ROOFTOP SOLAR NET METERING IN HYDERABAD & SOUTHERN TELANGANA

# SECTION 1: TSSPDCL APPLICATION AND APPROVAL WORKFLOW
1.1 Submission of Feasibility Application: Domestic and commercial consumers in Hyderabad and southern Telangana districts must submit a feasibility application to the Divisional Engineer (Operation) / Assistant Divisional Engineer (ADE) of TSSPDCL.
1.2 Required Documents:
    - Latest TSSPDCL electricity bill receipt
    - Proof of ownership / property legal document (or lease agreement)
    - Identity proof (Aadhaar Card / PAN Card)
    - Site layout plan showing proposed rooftop solar module location
    - Single Line Diagram (SLD) of the solar PV system and inverter connections
1.3 Feasibility Approval: TSSPDCL checks if the local Distribution Transformer (DTR) cumulative solar capacity limit (50% of DTR rating) is respected. Approval or rejection is communicated within 15 working days.

# SECTION 2: METERING AND TARIFF APPLICATION
2.1 Bi-Directional Net Meter Specifications: TSSPDCL provides or tests the consumer-procured bi-directional meter (Accuracy Class 0.5S or 1.0) with DLMS protocol compliance.
2.2 Solar Energy Generation Credit: TSSPDCL bills consumers on a monthly basis. Solar energy generated and fed into the TSSPDCL grid is offset unit-for-unit against units drawn from TSSPDCL during the billing month.
2.3 Net Metering Buyback Rate: Net excess energy remaining at the annual settlement date (March 31st) is settled by TSSPDCL at the TGERC-approved tariff rate (interim benchmark ₹3.50 per kWh or prevailing ACPP rate).
`,
}
