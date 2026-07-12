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

/**
 * A meaningful official bullet group beneath a numbered objective (e.g. "Public
 * key infrastructure" under SY0-701 1.4). Only used where the source document
 * has a genuinely distinct grouped area — not created per nested bullet.
 */
export interface SeedSubObjective {
  code: string; // natural key, unique within the parent objective
  title: string;
  concepts?: SeedConcept[];
}

export interface SeedObjective {
  code: string;
  title: string;
  placeholder?: boolean;
  subObjectives?: SeedSubObjective[];
  /** Concepts attached directly to the objective (no meaningful sub-grouping). */
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

  // --- Security+ SY0-701 (derived — not official CompTIA relationships) ---
  "non-repudiation": ["digital-signatures"],
  "aaa-framework": ["authentication"],
  "zero-trust": ["aaa-framework"],
  salting: ["hashing"],
  "key-stretching": ["hashing"],
  "crl-vs-ocsp": ["certificates"],
  "wildcard-certificate": ["certificates"],
  "tpm-vs-hsm": ["pki"],
  "tokenization-vs-masking": ["hashing"],
  "data-protection-methods": ["crypto-symmetric", "hashing"],
  "vulnerability-scan-vs-penetration-test": ["threat-vuln-risk"],
  "cvss-cve": ["vulnerability-scan-vs-penetration-test"],
  "vulnerability-remediation-strategies": ["cvss-cve"],
  "edr-vs-xdr": ["ids-ips"],
  "containment-vs-eradication": ["incident-response"],
  "chain-of-custody": ["incident-response"],
  "event-vs-alert-vs-incident": ["incident-response"],
  "hot-warm-cold-site": ["bcp-dr"],
  "load-balancing-vs-clustering": ["hot-warm-cold-site"],
  "backup-types": ["hot-warm-cold-site"],
  "sle-ale-aro": ["qualitative-vs-quantitative-risk"],
  "risk-management-strategies": ["qualitative-vs-quantitative-risk"],
  "privileged-access-management": ["access-control-models"],
  "access-control-models": ["least-privilege"],
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

/**
 * CompTIA Security+ SY0-701 — full official domain/objective hierarchy.
 *
 * OFFICIAL DATA (verbatim or near-verbatim from CompTIA): domain codes/names/
 * weights, objective codes, objective titles, sub-objective grouping labels
 * (paraphrased from the source document's own bullet headings where those
 * headings exist, e.g. "Public key infrastructure (PKI)").
 *
 * Canonical source: CompTIA Security+ SY0-701 Certification Exam: Exam
 * Objectives, Version 5.0 (docs/sources/CompTIA-Security-Plus-SY0-701-Exam-
 * Objectives.pdf). Validated: publisher CompTIA, exam SY0-701, version 5.0,
 * 5 domains, 28 numbered objectives, weights sum to 100%.
 *
 * DERIVED EDUCATIONAL METADATA (NOT official CompTIA wording — original
 * instructional content authored for this platform): every concept `name`/
 * `summary`, all concept groupings into sub-objectives beyond the source's own
 * headings, and every entry in `conceptDependencies` below. Concepts are
 * atomic and independently testable, not one-per-bullet or one-per-acronym —
 * the source document's exhaustive bullet/acronym lists are NOT reproduced
 * here; only representative, learner-relevant terms became concepts.
 *
 * Some official bullets appear under more than one objective in the source
 * (e.g. "Masking"/"Tokenization" under both 1.4 Obfuscation and 3.3 Methods to
 * secure data). The current schema allows a concept exactly one objective_id,
 * so such terms are modeled once, at their first/most foundational objective,
 * and not duplicated.
 */
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
          code: "1.1",
          title: "Compare and contrast various types of security controls",
          subObjectives: [
            {
              code: "control-categories",
              title: "Control categories",
              concepts: [
                {
                  slug: "control-categories",
                  name: "Security control categories",
                  summary: "Technical, managerial, operational, and physical controls — classified by HOW the control is implemented.",
                },
              ],
            },
            {
              code: "control-types",
              title: "Control types",
              concepts: [
                {
                  slug: "control-types",
                  name: "Preventive vs detective vs corrective controls",
                  summary: "Preventive stops an incident before it happens; detective identifies one in progress or after; corrective limits damage once found. Deterrent, compensating, and directive controls fill related gaps.",
                },
              ],
            },
          ],
        },
        {
          code: "1.2",
          title: "Summarize fundamental security concepts",
          subObjectives: [
            {
              code: "cia-aaa",
              title: "CIA and AAA",
              concepts: [
                { slug: "cia-triad", name: "CIA triad", summary: "Confidentiality, Integrity, Availability — the three properties most security controls protect." },
                { slug: "non-repudiation", name: "Non-repudiation", summary: "A party cannot credibly deny having performed an action, typically proven via digital signatures." },
                { slug: "aaa-framework", name: "AAA (Authentication, Authorization, Accounting)", summary: "Proving identity, granting permissions, and logging activity — three distinct, sequential steps." },
                { slug: "authentication", name: "Authentication", summary: "Proving identity — the first step of AAA, distinct from authorization." },
              ],
            },
            {
              code: "zero-trust",
              title: "Zero Trust",
              concepts: [
                {
                  slug: "zero-trust",
                  name: "Zero Trust control plane vs data plane",
                  summary: "The control plane (policy engine, policy administrator) decides access policy; the data plane (policy enforcement point) enforces it against real traffic.",
                },
              ],
            },
            {
              code: "deception-tech",
              title: "Deception and disruption technology",
              concepts: [
                {
                  slug: "deception-technology",
                  name: "Honeypot, honeynet, honeyfile, honeytoken",
                  summary: "Decoy systems, networks, files, and data planted to detect and study attackers rather than to serve real users.",
                },
              ],
            },
          ],
        },
        {
          code: "1.3",
          title: "Explain the importance of change management processes and the impact to security",
          concepts: [
            {
              slug: "change-management-process",
              name: "Change management process",
              summary: "Approval, impact analysis, testing, and a backout plan before a production change — security's stake in change control.",
            },
            {
              slug: "allow-list-vs-deny-list",
              name: "Allow list vs deny list",
              summary: "An allow list permits only explicitly approved items and blocks everything else (default-deny); a deny list blocks only named items and allows everything else (default-allow).",
            },
          ],
        },
        {
          code: "1.4",
          title: "Explain the importance of using appropriate cryptographic solutions",
          subObjectives: [
            {
              code: "pki",
              title: "Public key infrastructure",
              concepts: [
                { slug: "pki", name: "PKI", summary: "The infrastructure of certificate authorities, certificates, and trust relationships binding public keys to identities." },
              ],
            },
            {
              code: "encryption",
              title: "Encryption",
              concepts: [
                { slug: "crypto-symmetric", name: "Symmetric encryption", summary: "Same key encrypts and decrypts — fast, but the key must be shared securely." },
                { slug: "crypto-asymmetric", name: "Asymmetric encryption", summary: "A public/private key pair — what one key encrypts, only the other can decrypt." },
              ],
            },
            {
              code: "tools",
              title: "Cryptographic tools",
              concepts: [
                {
                  slug: "tpm-vs-hsm",
                  name: "TPM vs HSM",
                  summary: "A TPM is a chip soldered to one device's motherboard for that device's own keys; an HSM is a dedicated, often external/networked appliance managing keys for many systems.",
                },
              ],
            },
            {
              code: "obfuscation",
              title: "Obfuscation",
              concepts: [
                {
                  slug: "tokenization-vs-masking",
                  name: "Tokenization vs masking",
                  summary: "Tokenization swaps real data for a reversible reference token held in a separate vault; masking permanently obscures part of the data in place (e.g. showing only the last 4 digits).",
                },
              ],
            },
            {
              code: "hashing-salting",
              title: "Hashing and salting",
              concepts: [
                { slug: "hashing", name: "Hashing", summary: "A one-way function producing a fixed-size fingerprint of data — verifies integrity, does not encrypt." },
                { slug: "salting", name: "Salting", summary: "Adding random data to an input before hashing so identical inputs (e.g. two equal passwords) don't produce identical hashes." },
                { slug: "key-stretching", name: "Key stretching", summary: "Deliberately slowing a hash function (e.g. PBKDF2) with repeated iterations so brute-force password guessing becomes impractical." },
              ],
            },
            {
              code: "digital-signatures",
              title: "Digital signatures",
              concepts: [
                { slug: "digital-signatures", name: "Digital signatures", summary: "Signing a hash of a message with the sender's private key — proves authenticity, integrity, and non-repudiation together." },
              ],
            },
            {
              code: "certificates",
              title: "Certificates",
              concepts: [
                { slug: "certificates", name: "Certificates", summary: "A CA-signed document binding a public key to an identity." },
                {
                  slug: "crl-vs-ocsp",
                  name: "CRL vs OCSP",
                  summary: "A CRL is a downloaded list of all revoked certificates; OCSP is a live, single-certificate revocation check against the CA — OCSP scales better and is more current.",
                },
                { slug: "wildcard-certificate", name: "Wildcard certificate", summary: "A single certificate (e.g. *.example.com) valid for any subdomain of the named domain." },
              ],
            },
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
          concepts: [
            { slug: "threat-vuln-risk", name: "Threat vs vulnerability vs risk", summary: "A threat is a potential danger; a vulnerability is a weakness it could exploit; risk is the likelihood and impact if it does." },
            {
              slug: "threat-actors",
              name: "Threat actor types and motivations",
              summary: "Nation-state (well-resourced, espionage), organized crime (financial gain), hacktivist (ideology), insider threat (internal access), unskilled attacker (low sophistication) — distinguished by resources and motive, not just method.",
            },
          ],
        },
        {
          code: "2.2",
          title: "Explain common threat vectors and attack surfaces",
          subObjectives: [
            {
              code: "vectors",
              title: "Threat vectors",
              concepts: [
                {
                  slug: "threat-vectors",
                  name: "Threat vector vs attack surface",
                  summary: "A threat vector is the path an attack travels in (email, removable media, an open port); the attack surface is everything exposed that could be targeted.",
                },
              ],
            },
            {
              code: "social-engineering",
              title: "Social engineering",
              concepts: [
                {
                  slug: "social-engineering-channels",
                  name: "Phishing vs vishing vs smishing",
                  summary: "Same manipulation goal, different channel: phishing over email, vishing over voice calls, smishing over SMS text.",
                },
              ],
            },
          ],
        },
        {
          code: "2.3",
          title: "Explain various types of vulnerabilities",
          concepts: [
            { slug: "zero-day-vulnerability", name: "Zero-day vulnerability", summary: "A flaw unknown to the vendor with no patch available — exploited before a fix can exist." },
            { slug: "vm-escape", name: "VM escape", summary: "Breaking out of an isolated virtual machine to access the host or other VMs — the core risk virtualization is supposed to prevent." },
            {
              slug: "sqli-vs-xss",
              name: "SQL injection vs cross-site scripting",
              summary: "SQLi injects malicious database queries through unvalidated input; XSS injects malicious scripts that run in another user's browser. Both stem from trusting unvalidated input, but attack different targets.",
            },
          ],
        },
        {
          code: "2.4",
          title: "Given a scenario, analyze indicators of malicious activity",
          subObjectives: [
            {
              code: "malware",
              title: "Malware types",
              concepts: [
                {
                  slug: "trojan-vs-worm-vs-virus",
                  name: "Trojan vs worm vs virus",
                  summary: "A virus needs a host file and user action to spread; a worm self-propagates across a network with no user action; a trojan disguises itself as legitimate software and doesn't self-replicate.",
                },
                { slug: "rootkit-vs-logic-bomb", name: "Rootkit vs logic bomb", summary: "A rootkit hides ongoing privileged access; a logic bomb sits dormant until a trigger condition executes a payload." },
              ],
            },
            {
              code: "network-attacks",
              title: "Network attacks",
              concepts: [
                { slug: "ddos-amplified-vs-reflected", name: "Amplified vs reflected DDoS", summary: "Reflected DDoS spoofs the victim's source IP so replies flood the victim; amplified DDoS additionally uses requests whose replies are much larger than the request, multiplying the flood." },
              ],
            },
            {
              code: "password-attacks",
              title: "Password attacks",
              concepts: [
                { slug: "password-spraying-vs-brute-force", name: "Password spraying vs brute force", summary: "Brute force tries many passwords against one account; spraying tries one or few common passwords against many accounts to avoid lockout thresholds." },
              ],
            },
            {
              code: "indicators",
              title: "Indicators",
              concepts: [
                { slug: "malicious-activity-indicators", name: "Indicators of malicious activity", summary: "Account lockout, impossible travel, and abnormal resource consumption are signs an account or system may be compromised, even before a clear alert fires." },
              ],
            },
          ],
        },
        {
          code: "2.5",
          title: "Explain the purpose of mitigation techniques used to secure the enterprise",
          concepts: [
            { slug: "segmentation", name: "Network segmentation", summary: "Dividing a network into isolated zones so a breach in one zone can't freely reach another." },
            { slug: "least-privilege", name: "Least privilege", summary: "Granting only the minimum access needed to perform a job, nothing more." },
            { slug: "application-allow-list", name: "Application allow listing", summary: "Only explicitly approved applications may run — everything else is blocked by default, applying the allow-list model to executables." },
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
          title: "Compare and contrast security implications of different architecture models",
          subObjectives: [
            {
              code: "cloud-infrastructure",
              title: "Cloud and infrastructure concepts",
              concepts: [
                { slug: "cloud-responsibility-matrix", name: "Cloud shared responsibility matrix", summary: "The provider secures the cloud infrastructure itself; the customer remains responsible for securing what they put in it — the split shifts by service model (IaaS/PaaS/SaaS)." },
                { slug: "virtualization-vs-containerization", name: "Virtualization vs containerization", summary: "Virtualization runs full guest OS instances on a hypervisor; containers share one host OS kernel and isolate only the application layer — lighter weight, less isolation." },
                { slug: "iac-infrastructure-as-code", name: "Infrastructure as code", summary: "Defining and provisioning infrastructure through versioned configuration files instead of manual setup." },
              ],
            },
            {
              code: "specialized-systems",
              title: "Specialized and embedded systems",
              concepts: [
                { slug: "ics-scada", name: "ICS/SCADA", summary: "Industrial control systems and the supervisory software that monitors them — typically prioritize uptime over patching, unlike IT systems." },
              ],
            },
          ],
        },
        {
          code: "3.2",
          title: "Given a scenario, apply security principles to secure enterprise infrastructure",
          subObjectives: [
            {
              code: "appliances",
              title: "Network appliances",
              concepts: [
                { slug: "ids-ips", name: "IDS vs IPS", summary: "An IDS passively monitors and alerts on suspicious traffic (detection); an IPS sits inline and can actively block it (prevention)." },
                { slug: "jump-server-vs-proxy-server", name: "Jump server vs proxy server", summary: "A jump server is a hardened bastion host administrators pass through to reach a protected network; a proxy server relays and filters client requests to external resources." },
                { slug: "fail-open-vs-fail-closed", name: "Fail-open vs fail-closed", summary: "On failure, fail-open lets traffic pass unfiltered (favors availability); fail-closed blocks all traffic (favors security)." },
              ],
            },
            {
              code: "firewalls",
              title: "Firewall types",
              concepts: [
                { slug: "firewall-generations", name: "WAF vs NGFW vs UTM", summary: "A WAF inspects web application traffic specifically; an NGFW adds application-awareness to traditional firewalling; a UTM bundles many security functions (firewall, IPS, antivirus) into one appliance." },
              ],
            },
            {
              code: "secure-comms",
              title: "Secure communication and access",
              concepts: [
                { slug: "vpn-tunneling", name: "TLS vs IPSec tunneling", summary: "Both encrypt traffic in transit; TLS typically secures a specific application session, while IPSec operates at the network layer and can secure all traffic between two endpoints (site-to-site VPN)." },
              ],
            },
          ],
        },
        {
          code: "3.3",
          title: "Compare and contrast concepts and strategies to protect data",
          concepts: [
            { slug: "data-classification", name: "Data classification levels", summary: "Labeling data (public, private, confidential, restricted) so handling and protection requirements scale with sensitivity." },
            { slug: "data-states", name: "Data at rest vs in transit vs in use", summary: "Data at rest is stored; in transit is moving across a network; in use is actively processed in memory — each state needs different protections." },
            { slug: "data-protection-methods", name: "Data protection method selection", summary: "Choosing encryption, hashing, masking, tokenization, or segmentation based on whether data must remain usable, verifiable, or fully hidden." },
          ],
        },
        {
          code: "3.4",
          title: "Explain the importance of resilience and recovery in security architecture",
          concepts: [
            { slug: "hot-warm-cold-site", name: "Hot site vs warm site vs cold site", summary: "A hot site is fully equipped and can take over almost immediately; a warm site has some infrastructure ready but needs setup; a cold site is bare space requiring full buildout." },
            { slug: "load-balancing-vs-clustering", name: "Load balancing vs clustering", summary: "Load balancing distributes traffic across independent servers; clustering groups servers to act as one highly-available unit, often with automatic failover." },
            { slug: "backup-types", name: "Backup strategy fundamentals", summary: "Onsite/offsite placement, frequency, and encryption together determine how much data could be lost and how fast it can be restored." },
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
          title: "Given a scenario, apply common security techniques to computing resources",
          subObjectives: [
            {
              code: "hardening",
              title: "Secure baselines and hardening",
              concepts: [
                { slug: "secure-baseline", name: "Secure baseline", summary: "A documented, hardened starting configuration that systems are established from, deployed against, and continually maintained to match." },
              ],
            },
            {
              code: "mobile",
              title: "Mobile solutions",
              concepts: [
                { slug: "byod-cope-cyod", name: "BYOD vs COPE vs CYOD", summary: "BYOD: employee owns and enrolls a personal device. COPE: company owns it, employee may use it personally. CYOD: employee picks from a company-approved device list; company owns it." },
                { slug: "mdm-mobile-device-management", name: "Mobile device management (MDM)", summary: "Centralized tooling to enforce policy, push configuration, and remotely wipe managed mobile devices." },
              ],
            },
            {
              code: "wireless",
              title: "Wireless security settings",
              concepts: [
                { slug: "wpa3-wireless-security", name: "WPA3", summary: "The current Wi-Fi security standard, replacing WPA2, with stronger encryption and protection against offline password-guessing attacks." },
              ],
            },
          ],
        },
        {
          code: "4.2",
          title: "Explain the security implications of proper hardware, software, and data asset management",
          concepts: [
            { slug: "asset-lifecycle-management", name: "Asset lifecycle management", summary: "Tracking a device or license from acquisition through assignment, monitoring, and eventual decommissioning." },
            { slug: "media-sanitization-vs-destruction", name: "Sanitization vs destruction", summary: "Sanitization (e.g. wiping) removes data so the media can be reused; destruction physically or logically destroys the media so it cannot be reused at all." },
          ],
        },
        {
          code: "4.3",
          title: "Explain various activities associated with vulnerability management",
          subObjectives: [
            {
              code: "identification",
              title: "Identification methods",
              concepts: [
                { slug: "vulnerability-scan-vs-penetration-test", name: "Vulnerability scan vs penetration test", summary: "A vulnerability scan is automated and passive, listing potential weaknesses; a penetration test actively attempts to exploit them to prove real-world impact." },
              ],
            },
            {
              code: "analysis",
              title: "Analysis",
              concepts: [
                { slug: "false-positive-vs-false-negative", name: "False positive vs false negative", summary: "A false positive flags something safe as a threat; a false negative misses a real threat entirely — false negatives are generally more dangerous." },
                { slug: "cvss-cve", name: "CVSS vs CVE", summary: "A CVE is a unique identifier for a specific known vulnerability; CVSS is the standardized 0-10 score rating that vulnerability's severity." },
              ],
            },
            {
              code: "remediation",
              title: "Vulnerability response and remediation",
              concepts: [
                { slug: "vulnerability-remediation-strategies", name: "Vulnerability remediation strategies", summary: "Patching fixes the flaw directly; compensating controls, segmentation, or accepted exceptions manage the risk when patching isn't immediately possible." },
              ],
            },
          ],
        },
        {
          code: "4.4",
          title: "Explain security alerting and monitoring concepts and tools",
          concepts: [
            { slug: "siem-security-information-event-management", name: "SIEM", summary: "Aggregates logs from many sources into one system for correlated alerting, search, and reporting." },
            { slug: "log-aggregation-alerting", name: "Log aggregation and alert tuning", summary: "Centralizing logs is only useful if alert thresholds are tuned — too sensitive causes alert fatigue, too loose misses real incidents." },
            { slug: "dlp-data-loss-prevention", name: "Data loss prevention (DLP)", summary: "Tooling that detects and blocks sensitive data from leaving the organization through unauthorized channels." },
          ],
        },
        {
          code: "4.5",
          title: "Given a scenario, modify enterprise capabilities to enhance security",
          concepts: [
            { slug: "dmarc-dkim-spf", name: "DMARC, DKIM, and SPF", summary: "Three complementary email-authentication standards: SPF checks the sending server is authorized, DKIM verifies the message wasn't altered in transit, DMARC tells receivers what to do when SPF/DKIM fail." },
            { slug: "nac-network-access-control", name: "Network access control (NAC)", summary: "Evaluates a device's posture (patched, has antivirus, etc.) before allowing it onto the network." },
            { slug: "edr-vs-xdr", name: "EDR vs XDR", summary: "EDR monitors and responds to threats on individual endpoints; XDR correlates signals across endpoints, network, and other sources for broader detection." },
          ],
        },
        {
          code: "4.6",
          title: "Given a scenario, implement and maintain identity and access management",
          subObjectives: [
            {
              code: "sso",
              title: "Single sign-on",
              concepts: [
                { slug: "sso", name: "Single sign-on (SSO)", summary: "One authentication grants access to multiple independent systems without re-entering credentials." },
                { slug: "federation", name: "Federation", summary: "Extending trust in an identity across separate organizations, so one org's login works at another's service." },
                { slug: "saml", name: "SAML", summary: "An XML-based standard for exchanging SSO authentication and authorization assertions, common in enterprise identity federation." },
                { slug: "oauth", name: "OAuth", summary: "An authorization framework letting an app access another service's resources on a user's behalf, without handling the user's password." },
                { slug: "oidc", name: "OpenID Connect", summary: "An authentication layer built on top of OAuth 2.0 — OAuth authorizes access to resources, OIDC additionally verifies who the user is." },
              ],
            },
            {
              code: "access-controls",
              title: "Access controls",
              concepts: [
                { slug: "access-control-models", name: "RBAC vs DAC vs MAC", summary: "Role-based grants access by job role; discretionary lets the data owner decide who gets access; mandatory enforces a central authority's classification-based policy that owners cannot override." },
              ],
            },
            {
              code: "mfa",
              title: "Multifactor authentication",
              concepts: [
                { slug: "mfa", name: "Multi-factor authentication", summary: "Combining two or more distinct factor categories — something you know, have, are, or somewhere you are — so a single stolen credential isn't enough." },
              ],
            },
            {
              code: "pam",
              title: "Privileged access management",
              concepts: [
                { slug: "privileged-access-management", name: "Privileged access management (PAM)", summary: "Just-in-time elevation, password vaulting, and ephemeral credentials that grant privileged access only when needed and for a limited time." },
                { slug: "password-best-practices", name: "Password best practices", summary: "Length matters more than forced complexity; password managers and passwordless methods reduce reuse risk better than frequent forced rotation." },
              ],
            },
          ],
        },
        {
          code: "4.7",
          title: "Explain the importance of automation and orchestration related to secure operations",
          concepts: [
            { slug: "automation-benefits-risks", name: "Automation benefits vs risks", summary: "Automation saves time and enforces consistent baselines, but concentrates risk — a scripting error or single point of failure can now scale instantly across the whole environment." },
          ],
        },
        {
          code: "4.8",
          title: "Explain appropriate incident response activities",
          concepts: [
            { slug: "incident-response", name: "Incident response process", summary: "The ordered phases: preparation, detection, analysis, containment, eradication, recovery, and lessons learned." },
            { slug: "containment-vs-eradication", name: "Containment vs eradication", summary: "Containment stops an incident from spreading further right now; eradication removes the root cause afterward so it can't recur." },
            { slug: "chain-of-custody", name: "Chain of custody", summary: "An unbroken, documented record of who handled evidence and when — without it, evidence may be inadmissible or untrustworthy." },
          ],
        },
        {
          code: "4.9",
          title: "Given a scenario, use data sources to support an investigation",
          concepts: [
            { slug: "log-data-sources", name: "Log data sources for investigation", summary: "Firewall, endpoint, application, and network logs each capture a different vantage point — a full investigation usually needs several correlated together." },
            { slug: "event-vs-alert-vs-incident", name: "Event vs alert vs incident", summary: "An event is any logged occurrence; an alert is an event flagged as potentially significant; an incident is a confirmed, actionable security event requiring response." },
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
          subObjectives: [
            {
              code: "policies",
              title: "Policies and standards",
              concepts: [
                { slug: "security-policy-types", name: "Security policy types", summary: "AUP, incident response, business continuity, and SDLC policies each govern a distinct area — a policy states intent, a standard states the specific required configuration." },
                { slug: "bcp-dr", name: "BCP vs DR", summary: "Business continuity planning keeps critical operations running during a disruption; disaster recovery restores systems and data afterward." },
              ],
            },
            {
              code: "roles",
              title: "Roles and responsibilities for data",
              concepts: [
                { slug: "data-roles", name: "Data owner vs controller vs processor vs custodian", summary: "The owner is accountable for the data's classification and use; the controller decides how/why it's processed; the processor handles it on the controller's behalf; the custodian handles day-to-day technical safeguarding." },
              ],
            },
          ],
        },
        {
          code: "5.2",
          title: "Explain elements of the risk management process",
          subObjectives: [
            {
              code: "risk-analysis",
              title: "Risk analysis",
              concepts: [
                { slug: "qualitative-vs-quantitative-risk", name: "Qualitative vs quantitative risk analysis", summary: "Qualitative ranks risk using descriptive categories (low/medium/high); quantitative assigns real dollar figures to likelihood and impact." },
                { slug: "sle-ale-aro", name: "SLE, ALE, and ARO", summary: "SLE = expected loss from one occurrence; ARO = how many times per year it's expected to happen; ALE = SLE × ARO, the expected annual loss." },
              ],
            },
            {
              code: "strategies",
              title: "Risk management strategies",
              concepts: [
                { slug: "risk-management-strategies", name: "Risk transfer vs accept vs avoid vs mitigate", summary: "Transfer shifts risk to another party (e.g. insurance); accept knowingly keeps it; avoid eliminates the risky activity entirely; mitigate reduces likelihood or impact with controls." },
              ],
            },
            {
              code: "bia",
              title: "Business impact analysis",
              concepts: [
                { slug: "rto-rpo", name: "RTO vs RPO", summary: "RTO is the maximum acceptable time to restore a service after disruption; RPO is the maximum acceptable amount of data loss, measured in time since the last good backup." },
              ],
            },
          ],
        },
        {
          code: "5.3",
          title: "Explain the processes associated with third-party risk assessment and management",
          concepts: [
            { slug: "vendor-risk-assessment", name: "Vendor risk assessment", summary: "Evaluating a third party's security posture — via penetration test results, audit evidence, or a right-to-audit clause — before and during a business relationship." },
            { slug: "agreement-types", name: "SLA vs MOU vs NDA vs MSA", summary: "An SLA sets measurable service commitments; an MOU documents mutual intent without binding legal obligations; an NDA protects confidential information; an MSA sets the overarching terms governing future work orders." },
          ],
        },
        {
          code: "5.4",
          title: "Summarize elements of effective security compliance",
          concepts: [
            { slug: "compliance-monitoring", name: "Compliance monitoring", summary: "Ongoing due diligence, attestation, and automation that confirm controls remain in place — not just a one-time audit checkbox." },
            { slug: "right-to-be-forgotten", name: "Right to be forgotten", summary: "A privacy-regulation right (e.g. under GDPR) allowing an individual to request their personal data be deleted." },
          ],
        },
        {
          code: "5.5",
          title: "Explain types and purposes of audits and assessments",
          concepts: [
            { slug: "internal-vs-external-audit", name: "Internal vs external audit", summary: "Internal audits are performed by the organization's own staff for self-assessment; external audits are performed by an independent third party, often for regulatory or contractual assurance." },
            { slug: "pentest-environment-knowledge", name: "Known vs partially known vs unknown environment testing", summary: "Known environment (white box): tester has full information. Partially known (gray box): tester has some. Unknown (black box): tester starts with none, simulating a real external attacker." },
          ],
        },
        {
          code: "5.6",
          title: "Given a scenario, implement security awareness practices",
          concepts: [
            { slug: "security-awareness-training", name: "Security awareness training", summary: "Ongoing phishing simulations and user guidance that build a workforce's ability to recognize and report social engineering, not just a one-time onboarding session." },
            { slug: "insider-threat-recognition", name: "Insider threat recognition", summary: "Recognizing risky, unexpected, or unintentional user behavior as a potential indicator of insider threat, distinct from external attack indicators." },
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
