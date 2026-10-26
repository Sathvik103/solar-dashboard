import type { IngestDocumentInput } from '@/lib/rag/ingestion'

export const tgredcoGuidelines: IngestDocumentInput = {
  title: 'Summary: TGREDCO Grid Connected Rooftop Solar Power Plant Technical Guidelines & Application Procedure',
  source: 'Telangana State Renewable Energy Development Corporation Ltd (TGREDCO)',
  sourceUrl: 'https://tgredco.telangana.gov.in/Rooftop_Solar_Guidelines.pdf',
  organization: 'TGREDCO',
  documentType: 'Official Guidance (unofficial summary)',
  locationScope: 'Telangana',
  publicationDate: '2021-08-01',
  effectiveDate: '2021-08-01',
  version: 'v2.1',
  status: 'published',
  content: `
NOTE: This is an unofficial summary prepared for SolarIntel, not the verbatim official text. Verify figures and procedures against the source URL before relying on them.
--- Page 1 ---
TELANGANA STATE RENEWABLE ENERGY DEVELOPMENT CORPORATION LTD (TGREDCO)
HYDERABAD, TELANGANA

GRID CONNECTED ROOFTOP SOLAR PV SYSTEM GUIDELINES & APPLICATION PROCEDURE

# SECTION 1: ROLE OF TGREDCO AND APPLICATION PROCESS
1.1 TGREDCO is the state nodal agency designated by the Government of Telangana for promoting renewable energy and implementing rooftop solar initiatives across Telangana State.
1.2 Application Procedure: Interested domestic, commercial, and institutional consumers must register online on the TGREDCO web portal or the national PM Surya Ghar portal.
1.3 Technical Feasibility Inspection: Upon receipt of an application, the concerned DISCOM (TSSPDCL / TSNPDCL) conducts a technical feasibility inspection of the distribution transformer capacity and consumer premises within 15 working days.

# SECTION 2: APPROVED VENDORS AND TECHNICAL SPECIFICATIONS
2.1 Empanelled System Integrators: Solar rooftop installations eligible for government subsidies must be installed only through TGREDCO-empanelled / MNRE-registered solar vendors.
2.2 Solar Modules and Inverters: Solar PV modules used in grid-connected rooftop systems must comply with Bureau of Indian Standards (BIS) specifications and be listed on the Approved List of Models and Manufacturers (ALMM) issued by MNRE.
2.3 Inverter Protection: Inverters must possess anti-islanding protection features to automatically disconnect the solar system from the grid in the event of grid failure or outage, protecting line maintenance personnel.

# SECTION 3: SUBSIDY DISBURSEMENT AND NET METERING COMMISSIONING
3.1 Joint Inspection: Following installation of the rooftop solar system by an empanelled vendor, a joint inspection is conducted by TGREDCO and DISCOM officials.
3.2 Bi-Directional Net Meter Installation: DISCOM installs an ISI-marked bi-directional net meter at the consumer premises to measure export and import of electricity.
3.3 Commissioning Certificate: Upon successful meter installation and grid synchronization, DISCOM issues a formal Commissioning Certificate to the consumer, enabling credit settlement under TGERC net metering regulations.
`,
}
