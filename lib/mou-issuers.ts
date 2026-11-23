/** The companies an MOU can be issued by. Plain data, shared by the server (documents) and the admin page. */
export type MouIssuerId = "cloud-institution" | "genai-labs"

export interface MouIssuer {
  id: MouIssuerId
  name: string
  /** Who signs for the company by default (editable on every MOU). */
  signer_name: string
  signer_title: string
  /** The coordinator row in section 7 of the MOU (used when the wording is derived for GenAI Labs). */
  coord_name: string
  coord_title: string
  coord_email: string
  coord_phone: string
  address: string
  email: string
  /** Keys of the stamp and logo images (see lib/server/letter-assets.ts). */
  seal: string
  logo: string
}

export const MOU_ISSUERS: MouIssuer[] = [
  {
    id: "cloud-institution", name: "Cloud Institution", signer_name: "Dilip Desing", signer_title: "Chief Executive Officer",
    coord_name: "Dilip D", coord_title: "CEO", coord_email: "dilipd@cloudinstitution.com", coord_phone: "+91 81052 25363",
    address: "4th Floor, HB Complex, No. 2, 100 Feet Ring Road, near Silk Board, Dollar Scheme Colony, BTM 1st Stage, Bengaluru, Karnataka – 560068",
    email: "dilipd@cloudinstitution.com", seal: "/vtu_seal.jpg", logo: "/vtu_logo.png",
  },
  {
    id: "genai-labs", name: "GenAI Labs", signer_name: "Dilip Desing", signer_title: "CEO & Founder",
    coord_name: "Dilip D", coord_title: "CEO & Founder", coord_email: "info@genailabs.in", coord_phone: "+91 63619 58074",
    address: "4th Floor, No. 2, HB Complex, 100 Feet Ring Road, Dollar Scheme Colony, BTM 1st Stage, Bengaluru, Karnataka – 560068",
    email: "info@genailabs.in", seal: "/genailabs_seal.jpg", logo: "/genailabs_logo.png",
  },
]

export const DEFAULT_ISSUER: MouIssuerId = "cloud-institution"
export const issuerById = (id: unknown): MouIssuer => MOU_ISSUERS.find((i) => i.id === id) ?? MOU_ISSUERS[0]
export const isIssuerId = (id: unknown): id is MouIssuerId => MOU_ISSUERS.some((i) => i.id === id)
