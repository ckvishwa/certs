/**
 * Syllabus seed data. The official blueprint is the source of truth; where exact
 * official objective WORDING has not yet been sourced/reviewed, objectives are
 * marked `placeholder: true` and titles are paraphrased. Domain weights follow
 * the published blueprints. Concepts + dependencies model the knowledge graph.
 *
 * IMPORTANT: paraphrased objective titles must be replaced with reviewed
 * official text before production. Placeholders are surfaced in the UI.
 */

export interface SeedConcept {
  slug: string;
  name: string;
  summary?: string;
  placeholder?: boolean;
}

export interface SeedObjective {
  code: string;
  title: string;
  placeholder?: boolean;
  concepts?: SeedConcept[];
}

export interface SeedDomain {
  code: string;
  title: string;
  weight: number; // blueprint percentage
  objectives: SeedObjective[];
}

export interface SeedVersion {
  code: string;
  name: string;
  isActive: boolean;
  activeFrom?: string;
  testingUntil?: string;
  domains: SeedDomain[];
}

export interface SeedCertification {
  slug: string;
  name: string;
  vendor: string;
  description: string;
  versions: SeedVersion[];
}

/** concept slug -> prerequisite concept slugs (knowledge graph edges). */
export const conceptDependencies: Record<string, string[]> = {
  "ipv4-addressing": ["binary-math"],
  "subnet-mask": ["ipv4-addressing"],
  subnetting: ["subnet-mask"],
  vlsm: ["subnetting"],
  trunking: ["vlan"],
  stp: ["vlan"],
  etherchannel: ["trunking"],
  ospf: ["subnetting"],
  "route-selection": ["ospf", "static-routing"],
  "crypto-asymmetric": ["crypto-symmetric"],
  "digital-signatures": ["hashing", "crypto-asymmetric"],
  certificates: ["digital-signatures"],
  pki: ["certificates"],
  mfa: ["authentication"],
  sso: ["authentication"],
  federation: ["sso"],
  saml: ["federation"],
  oauth: ["federation"],
  oidc: ["oauth"],
};

const ccnaV11: SeedVersion = {
  code: "200-301 v1.1",
  name: "CCNA 200-301 v1.1",
  isActive: true,
  activeFrom: "2024-08-20",
  domains: [
    {
      code: "1",
      title: "Network Fundamentals",
      weight: 20,
      objectives: [
        {
          code: "1.1",
          title: "Explain the role and function of network components",
          placeholder: true,
        },
        {
          code: "1.6",
          title: "Configure and verify IPv4 addressing and subnetting",
          placeholder: true,
          concepts: [
            { slug: "binary-math", name: "Binary math", summary: "Converting between binary and decimal — the basis of subnetting." },
            { slug: "ipv4-addressing", name: "IPv4 addressing", summary: "Structure of IPv4 addresses and classes." },
            { slug: "subnet-mask", name: "Subnet masks", summary: "How masks split network and host portions." },
            { slug: "subnetting", name: "Subnetting", summary: "Dividing networks; finding network/broadcast/host ranges." },
            { slug: "vlsm", name: "VLSM", summary: "Variable-length subnet masking for efficient allocation." },
          ],
        },
        {
          code: "1.8",
          title: "Configure and verify IPv6 addressing and prefixes",
          placeholder: true,
          concepts: [
            { slug: "ipv6-addressing", name: "IPv6 addressing", summary: "IPv6 address format and types." },
          ],
        },
        {
          code: "1.11",
          title: "Describe wireless principles",
          placeholder: true,
          concepts: [{ slug: "wireless-principles", name: "Wireless principles" }],
        },
      ],
    },
    {
      code: "2",
      title: "Network Access",
      weight: 20,
      objectives: [
        {
          code: "2.1",
          title: "Configure and verify VLANs across multiple switches",
          placeholder: true,
          concepts: [
            { slug: "vlan", name: "VLANs", summary: "Segmenting a switched network into broadcast domains." },
            { slug: "trunking", name: "Trunking (802.1Q)", summary: "Carrying multiple VLANs over one link." },
          ],
        },
        {
          code: "2.3",
          title: "Configure and verify Layer 2 discovery and EtherChannel",
          placeholder: true,
          concepts: [
            { slug: "etherchannel", name: "EtherChannel", summary: "Bundling links for bandwidth and redundancy." },
          ],
        },
        {
          code: "2.4",
          title: "Interpret spanning tree protocol operation",
          placeholder: true,
          concepts: [
            { slug: "stp", name: "Spanning Tree Protocol", summary: "Loop prevention; root/port roles and states." },
          ],
        },
      ],
    },
    {
      code: "3",
      title: "IP Connectivity",
      weight: 25,
      objectives: [
        {
          code: "3.1",
          title: "Interpret the components of a routing table",
          placeholder: true,
          concepts: [
            { slug: "route-selection", name: "Route selection", summary: "Longest prefix match, AD, and metric." },
          ],
        },
        {
          code: "3.3",
          title: "Configure and verify IPv4 and IPv6 static routing",
          placeholder: true,
          concepts: [
            { slug: "static-routing", name: "Static routing", summary: "Manually configured routes and default routes." },
          ],
        },
        {
          code: "3.4",
          title: "Configure and verify single-area OSPFv2",
          placeholder: true,
          concepts: [
            { slug: "ospf", name: "OSPF", summary: "Link-state IGP; neighbors, DR/BDR, cost." },
            { slug: "ospf-neighbors", name: "OSPF neighbor formation", summary: "Adjacency states and requirements." },
          ],
        },
      ],
    },
    {
      code: "4",
      title: "IP Services",
      weight: 10,
      objectives: [
        { code: "4.1", title: "Configure and verify inside source NAT", placeholder: true, concepts: [{ slug: "nat", name: "NAT / PAT", summary: "Translating private to public addresses." }] },
        { code: "4.3", title: "Explain the role of DHCP and DNS", placeholder: true, concepts: [{ slug: "dhcp", name: "DHCP", summary: "Automatic IP address assignment." }] },
      ],
    },
    {
      code: "5",
      title: "Security Fundamentals",
      weight: 15,
      objectives: [
        { code: "5.3", title: "Configure device access control using local passwords", placeholder: true, concepts: [{ slug: "device-hardening", name: "Device hardening" }] },
        { code: "5.5", title: "Describe remote access and site-to-site VPNs", placeholder: true },
        { code: "5.7", title: "Configure and verify access control lists", placeholder: true, concepts: [{ slug: "acl", name: "Access Control Lists", summary: "Filtering traffic by rules." }] },
      ],
    },
    {
      code: "6",
      title: "Automation and Programmability",
      weight: 10,
      objectives: [
        { code: "6.1", title: "Explain how automation impacts network management", placeholder: true },
        { code: "6.4", title: "Interpret JSON-encoded data", placeholder: true, concepts: [{ slug: "json-basics", name: "JSON encoding" }] },
      ],
    },
  ],
};

const ccnaV20: SeedVersion = {
  code: "200-301 v2.0",
  name: "CCNA 200-301 v2.0",
  isActive: false,
  activeFrom: "2027-02-03",
  // Structure only — v2.0 objectives are placeholders pending the official blueprint.
  domains: ccnaV11.domains.map((d) => ({
    code: d.code,
    title: d.title,
    weight: d.weight,
    objectives: [
      {
        code: `${d.code}.x`,
        title: `PLACEHOLDER — ${d.title} objectives (pending official v2.0 blueprint)`,
        placeholder: true,
      },
    ],
  })),
};

const securityPlus701: SeedVersion = {
  code: "SY0-701",
  name: "CompTIA Security+ SY0-701",
  isActive: true,
  activeFrom: "2023-11-07",
  domains: [
    {
      code: "1",
      title: "General Security Concepts",
      weight: 12,
      objectives: [
        {
          code: "1.4",
          title: "Explain the importance of using appropriate cryptographic solutions",
          placeholder: true,
          concepts: [
            { slug: "cia-triad", name: "CIA triad", summary: "Confidentiality, Integrity, Availability." },
            { slug: "crypto-symmetric", name: "Symmetric encryption", summary: "Same key to encrypt and decrypt." },
            { slug: "crypto-asymmetric", name: "Asymmetric encryption", summary: "Public/private key pairs." },
            { slug: "hashing", name: "Hashing", summary: "One-way integrity functions." },
            { slug: "digital-signatures", name: "Digital signatures", summary: "Authenticity + integrity via private-key signing." },
            { slug: "certificates", name: "Certificates", summary: "Binding identity to a public key." },
            { slug: "pki", name: "PKI", summary: "Infrastructure of CAs, certs, and trust." },
          ],
        },
      ],
    },
    {
      code: "2",
      title: "Threats, Vulnerabilities, and Mitigations",
      weight: 22,
      objectives: [
        {
          code: "2.1",
          title: "Compare and contrast common threat actors and motivations",
          placeholder: true,
          concepts: [
            { slug: "threat-vuln-risk", name: "Threat vs vulnerability vs risk", summary: "Distinguishing the three." },
          ],
        },
      ],
    },
    {
      code: "3",
      title: "Security Architecture",
      weight: 18,
      objectives: [
        {
          code: "3.1",
          title: "Compare and contrast security implications of architecture models",
          placeholder: true,
          concepts: [
            { slug: "authentication", name: "Authentication", summary: "Proving identity." },
            { slug: "mfa", name: "Multi-factor authentication", summary: "Two or more factors." },
            { slug: "sso", name: "Single sign-on", summary: "One login across services." },
            { slug: "federation", name: "Federation", summary: "Trust across identity domains." },
            { slug: "saml", name: "SAML", summary: "XML-based SSO assertions." },
            { slug: "oauth", name: "OAuth", summary: "Delegated authorization." },
            { slug: "oidc", name: "OpenID Connect", summary: "Authentication layer on OAuth." },
          ],
        },
      ],
    },
    {
      code: "4",
      title: "Security Operations",
      weight: 28,
      objectives: [
        {
          code: "4.1",
          title: "Apply common security techniques to computing resources",
          placeholder: true,
          concepts: [
            { slug: "ids-ips", name: "IDS vs IPS", summary: "Detection vs prevention." },
            { slug: "incident-response", name: "Incident response", summary: "Phases of handling incidents." },
          ],
        },
      ],
    },
    {
      code: "5",
      title: "Security Program Management and Oversight",
      weight: 20,
      objectives: [
        {
          code: "5.1",
          title: "Summarize elements of effective security governance",
          placeholder: true,
          concepts: [
            { slug: "rto-rpo", name: "RTO vs RPO", summary: "Recovery time vs recovery point objectives." },
            { slug: "bcp-dr", name: "BCP vs DR", summary: "Continuity vs disaster recovery." },
          ],
        },
      ],
    },
  ],
};

// --- Curated questions -----------------------------------------------------
export type SeedSkill =
  | "REMEMBER"
  | "UNDERSTAND"
  | "APPLY"
  | "ANALYZE"
  | "TROUBLESHOOT";

export interface SeedChoice {
  label: string;
  body: string;
  correct?: boolean;
  rationale?: string;
}

export interface SeedQuestion {
  ref: string; // stable external ref for idempotent seeding
  versionCode: string; // matches SeedVersion.code
  conceptSlug: string;
  kind?: "SINGLE" | "MULTI";
  difficulty?: number; // 1..5
  skill?: SeedSkill;
  stem: string;
  explanation?: string;
  examTrap?: string;
  choices: SeedChoice[];
}

export const seedQuestions: SeedQuestion[] = [
  {
    ref: "ccna-subnet-1",
    versionCode: "200-301 v1.1",
    conceptSlug: "subnetting",
    difficulty: 2,
    skill: "APPLY",
    stem: "A host has IP 192.168.10.100/26. What is the network address of its subnet?",
    explanation:
      "/26 = mask 255.255.255.192, block size 64 in the last octet. Subnets are .0, .64, .128, .192. 100 falls in the .64 subnet, so the network address is 192.168.10.64.",
    examTrap: "Forgetting the /26 block size is 64, not 32.",
    choices: [
      { label: "A", body: "192.168.10.0", rationale: "That is the .0 subnet; 100 is above .64." },
      { label: "B", body: "192.168.10.64", correct: true, rationale: "100 is within the 64–127 range." },
      { label: "C", body: "192.168.10.96", rationale: "Not a valid /26 boundary." },
      { label: "D", body: "192.168.10.128", rationale: "That subnet starts at 128; 100 is below it." },
    ],
  },
  {
    ref: "ccna-subnet-2",
    versionCode: "200-301 v1.1",
    conceptSlug: "subnetting",
    difficulty: 3,
    skill: "APPLY",
    stem: "How many usable host addresses are available in a /27 subnet?",
    explanation: "/27 leaves 5 host bits: 2^5 - 2 = 30 usable hosts.",
    choices: [
      { label: "A", body: "30", correct: true, rationale: "2^5 - 2 = 30." },
      { label: "B", body: "32", rationale: "That is the total addresses, not usable." },
      { label: "C", body: "14", rationale: "That would be a /28." },
      { label: "D", body: "62", rationale: "That would be a /26." },
    ],
  },
  {
    ref: "ccna-ospf-ad",
    versionCode: "200-301 v1.1",
    conceptSlug: "ospf",
    difficulty: 1,
    skill: "REMEMBER",
    stem: "What is the default administrative distance of OSPF?",
    explanation: "OSPF's default administrative distance is 110.",
    examTrap: "Confusing OSPF (110) with EIGRP (90) or RIP (120).",
    choices: [
      { label: "A", body: "90", rationale: "That is internal EIGRP." },
      { label: "B", body: "110", correct: true, rationale: "OSPF default AD." },
      { label: "C", body: "120", rationale: "That is RIP." },
      { label: "D", body: "1", rationale: "That is a static route to a next hop." },
    ],
  },
  {
    ref: "ccna-ospf-neighbors",
    versionCode: "200-301 v1.1",
    conceptSlug: "ospf-neighbors",
    difficulty: 4,
    skill: "TROUBLESHOOT",
    stem: "Two OSPF routers are stuck in the EXSTART/EXCHANGE state. Which mismatch most likely causes this?",
    explanation:
      "EXSTART/EXCHANGE problems are classically caused by an MTU mismatch between the two interfaces.",
    examTrap: "Assuming it is always an area or subnet mismatch (those prevent reaching 2-WAY/EXSTART at all).",
    choices: [
      { label: "A", body: "MTU mismatch", correct: true, rationale: "Classic EXSTART/EXCHANGE cause." },
      { label: "B", body: "Different hello timers", rationale: "That prevents forming neighbors at all." },
      { label: "C", body: "Mismatched area IDs", rationale: "That prevents the adjacency earlier." },
      { label: "D", body: "Duplicate router IDs", rationale: "Different symptom (neighbor flaps/errors)." },
    ],
  },
  {
    ref: "ccna-vlan-trunk",
    versionCode: "200-301 v1.1",
    conceptSlug: "vlan",
    difficulty: 2,
    skill: "UNDERSTAND",
    stem: "Which statement best describes an 802.1Q trunk port?",
    explanation:
      "A trunk carries traffic for multiple VLANs by tagging frames with the VLAN ID (except the native VLAN, which is untagged).",
    choices: [
      { label: "A", body: "It belongs to a single VLAN and carries untagged frames only", rationale: "That describes an access port." },
      { label: "B", body: "It carries multiple VLANs, tagging frames with the VLAN ID", correct: true },
      { label: "C", body: "It disables spanning tree", rationale: "Unrelated to trunking." },
      { label: "D", body: "It only carries the native VLAN", rationale: "The native VLAN is just the untagged one." },
    ],
  },
  {
    ref: "ccna-stp-roles",
    versionCode: "200-301 v1.1",
    conceptSlug: "stp",
    difficulty: 3,
    skill: "UNDERSTAND",
    stem: "On a non-root switch, which port is the single port with the lowest cost path to the root bridge?",
    explanation: "The root port is the non-root switch's best (lowest-cost) path toward the root bridge.",
    examTrap: "Confusing the root port (on non-root switches) with designated ports (per segment).",
    choices: [
      { label: "A", body: "Designated port", rationale: "Designated ports are per-segment, forwarding away from root." },
      { label: "B", body: "Root port", correct: true },
      { label: "C", body: "Blocking port", rationale: "That is a non-designated, blocked port." },
      { label: "D", body: "Alternate port", rationale: "Backup path, not the best path in use." },
    ],
  },
  {
    ref: "ccna-nat-pat",
    versionCode: "200-301 v1.1",
    conceptSlug: "nat",
    difficulty: 2,
    skill: "UNDERSTAND",
    stem: "Which NAT variant maps many private hosts to a single public IP using port numbers?",
    explanation: "PAT (NAT overload) distinguishes flows by source port, sharing one public IP.",
    choices: [
      { label: "A", body: "Static NAT", rationale: "One-to-one fixed mapping." },
      { label: "B", body: "Dynamic NAT", rationale: "Pool of public IPs, still one-to-one at a time." },
      { label: "C", body: "PAT (NAT overload)", correct: true },
      { label: "D", body: "Twice NAT", rationale: "Translates both source and destination." },
    ],
  },
  {
    ref: "sec-pki-1",
    versionCode: "SY0-701",
    conceptSlug: "pki",
    difficulty: 2,
    skill: "UNDERSTAND",
    stem: "In PKI, which key is used to create a digital signature?",
    explanation:
      "The signer signs with their PRIVATE key; verifiers check it with the corresponding public key.",
    examTrap: "Reversing public/private: encryption for confidentiality uses the recipient's public key, but signing uses the signer's private key.",
    choices: [
      { label: "A", body: "The signer's private key", correct: true },
      { label: "B", body: "The signer's public key", rationale: "Public key verifies, not signs." },
      { label: "C", body: "The recipient's public key", rationale: "That is for confidentiality encryption." },
      { label: "D", body: "A shared symmetric key", rationale: "Signatures are asymmetric." },
    ],
  },
  {
    ref: "sec-saml-oauth",
    versionCode: "SY0-701",
    conceptSlug: "oauth",
    difficulty: 3,
    skill: "ANALYZE",
    stem: "An app needs to let users grant it limited access to their data on another service WITHOUT sharing passwords. Which protocol fits best?",
    explanation:
      "OAuth 2.0 is an authorization framework for delegated access via tokens; SAML is primarily for SSO authentication assertions.",
    examTrap: "Choosing SAML (authentication/SSO) when the need is delegated authorization.",
    choices: [
      { label: "A", body: "SAML", rationale: "SAML is for SSO authentication assertions." },
      { label: "B", body: "OAuth 2.0", correct: true },
      { label: "C", body: "RADIUS", rationale: "Network access AAA, not delegated app authorization." },
      { label: "D", body: "Kerberos", rationale: "Ticket-based authentication within a domain." },
    ],
  },
  {
    ref: "sec-ids-ips",
    versionCode: "SY0-701",
    conceptSlug: "ids-ips",
    difficulty: 1,
    skill: "REMEMBER",
    stem: "What is the key difference between an IDS and an IPS?",
    explanation:
      "An IDS detects and alerts (passive/out-of-band); an IPS sits inline and can block/prevent traffic.",
    choices: [
      { label: "A", body: "An IDS blocks traffic; an IPS only logs", rationale: "Reversed." },
      { label: "B", body: "An IDS detects/alerts; an IPS can block inline", correct: true },
      { label: "C", body: "They are identical", rationale: "They differ in placement and action." },
      { label: "D", body: "An IPS only works on encrypted traffic", rationale: "Not a defining difference." },
    ],
  },
  {
    ref: "sec-rto-rpo",
    versionCode: "SY0-701",
    conceptSlug: "rto-rpo",
    difficulty: 3,
    skill: "ANALYZE",
    stem: "A policy states 'we can lose at most 15 minutes of data.' Which metric does this define?",
    explanation:
      "RPO (Recovery Point Objective) is the maximum acceptable DATA loss measured in time. RTO is how long to restore service.",
    examTrap: "Swapping RPO (data loss) with RTO (downtime).",
    choices: [
      { label: "A", body: "RTO", rationale: "RTO is acceptable downtime, not data loss." },
      { label: "B", body: "RPO", correct: true },
      { label: "C", body: "MTBF", rationale: "Mean time between failures." },
      { label: "D", body: "MTTR", rationale: "Mean time to repair." },
    ],
  },
  {
    ref: "sec-threat-vuln-risk",
    versionCode: "SY0-701",
    conceptSlug: "threat-vuln-risk",
    difficulty: 2,
    skill: "UNDERSTAND",
    stem: "An unpatched web server is exposed to the internet. The 'unpatched software' itself is best classified as a:",
    explanation:
      "A vulnerability is a weakness. A threat is the actor/event that could exploit it; risk is the potential for loss when a threat exploits a vulnerability.",
    examTrap: "Calling the weakness a 'threat' — the threat is the exploiting actor/event.",
    choices: [
      { label: "A", body: "Threat", rationale: "The threat is what exploits the weakness." },
      { label: "B", body: "Vulnerability", correct: true },
      { label: "C", body: "Risk", rationale: "Risk is the combination/likelihood of loss." },
      { label: "D", body: "Exploit", rationale: "An exploit is the method used against a vulnerability." },
    ],
  },
];

export const seedCertifications: SeedCertification[] = [
  {
    slug: "ccna",
    name: "Cisco CCNA",
    vendor: "Cisco",
    description:
      "Cisco Certified Network Associate — foundational networking across routing, switching, services, security, and automation.",
    versions: [ccnaV11, ccnaV20],
  },
  {
    slug: "security-plus",
    name: "CompTIA Security+",
    vendor: "CompTIA",
    description:
      "Vendor-neutral baseline cybersecurity certification across concepts, threats, architecture, operations, and governance.",
    versions: [securityPlus701],
  },
];
