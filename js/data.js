// All skill content is derived from the CV. `demo` links a skill to a live
// interactive demo in demos.js; `level` states where the depth comes from.
window.CATEGORIES = [
  { id: 'cloud',    name: 'Cloud & Streaming',     color: '#5eead4' },
  { id: 'devops',   name: 'Containers & CI/CD',    color: '#60a5fa' },
  { id: 'backend',  name: 'Languages & Backend',   color: '#a78bfa' },
  { id: 'mobile',   name: 'Mobile',                color: '#fbbf24' },
  { id: 'ai',       name: 'AI Research & Workflows', color: '#f472b6' },
  { id: 'security', name: 'Security & Networking', color: '#f87171' },
  { id: 'vision',   name: 'Computer Vision',       color: '#34d399' },
  { id: 'cs',       name: 'CS Foundations & IT',   color: '#94a3b8' },
];

window.LEVELS = {
  prod:     { label: 'Production',        hint: 'Shipped at osApps' },
  project:  { label: 'Built & researched', hint: 'Own project / research' },
  academic: { label: 'Academic',          hint: 'B.Sc. coursework' },
  it:       { label: 'Professional IT',   hint: 'Bank Leumi / Dr. PC' },
};

window.SKILLS = [
  // ---------- Cloud & streaming ----------
  {
    id: 'pubsub', name: 'GCP Pub/Sub', cat: 'cloud', level: 'prod', demo: 'pubsub',
    where: 'osApps: core analytics pipeline',
    depth: 'I moved osApps\' core analytics from legacy batch ETL to an event-driven Pub/Sub architecture. Live user-session events are published as they happen and fan out to several subscribers at once: BigQuery for analytics, GCS for raw archival and Cloud databases for serving.',
    can: ['Topic and subscription design, fan-out to multiple sinks', 'Moving from batch ETL to streaming without losing data', 'Choosing message schemas (Protobuf / JSON) per consumer', 'Thinking about ordering, retries and idempotent consumers'],
  },
  {
    id: 'bigquery', name: 'BigQuery', cat: 'cloud', level: 'prod', demo: 'sql',
    where: 'osApps: streaming sink and analytics warehouse',
    depth: 'BigQuery is where the streamed session events land. I design the tables that the stream writes into and the SQL that turns raw events into product analytics.',
    can: ['Streaming inserts from Pub/Sub', 'Analytical SQL: aggregations, windows, cohorts', 'Schema design for event data'],
  },
  {
    id: 'protobuf', name: 'Protobuf', cat: 'cloud', level: 'prod', demo: 'protobuf',
    where: 'osApps: wire format for session events',
    depth: 'Session events travel through the pipeline as Protobuf or JSON depending on the consumer. I understand the wire format itself (field tags, varints, length-delimited fields), not only the generated code. The demo below encodes a message byte by byte, live in your browser.',
    can: ['Schema design and evolution', 'Binary wire-format encoding', 'Picking Protobuf or JSON per consumer'],
  },
  {
    id: 'gcs', name: 'Google Cloud Storage', cat: 'cloud', level: 'prod', demo: 'pubsub',
    where: 'osApps: raw event archive',
    depth: 'GCS is one of the Pub/Sub fan-out sinks. It keeps a raw, replayable archive of every event alongside the BigQuery analytics copy.',
    can: ['Raw-data archival', 'Bucket layout for event data', 'Using GCS as a replay source'],
  },
  {
    id: 'aws', name: 'AWS (EC2, S3)', cat: 'cloud', level: 'prod', demo: 'cicd',
    where: 'osApps: hosting and deployments',
    depth: 'I host web apps and backends on EC2 with S3 for storage, and deploy them through automated CI/CD pipelines instead of by hand.',
    can: ['EC2 hosting for Node.js/TypeScript services', 'S3 storage', 'Automated deploys from GitHub Actions'],
  },
  {
    id: 'firebase', name: 'Firebase', cat: 'cloud', level: 'prod', demo: 'firebase',
    where: 'osApps: QA bug-monitoring app',
    depth: 'Firebase (Auth, Firestore, Realtime Database) is the real-time backbone of the QA app I built. Developers and QA see the same bug state instantly on iOS and Android. The demo shows two devices syncing through a shared store.',
    can: ['Firestore / Realtime DB data modelling', 'Real-time listeners and state persistence', 'Firebase Auth'],
  },

  // ---------- DevOps ----------
  {
    id: 'docker', name: 'Docker', cat: 'devops', level: 'prod', demo: 'docker',
    where: 'osApps: containerized build & deploy',
    depth: 'Every service I ship is containerized. The part that matters for fast CI is layer caching: ordering a Dockerfile so that a code change doesn\'t reinstall every dependency. The demo shows which layers rebuild for each kind of change.',
    can: ['Writing cache-efficient Dockerfiles', 'Multi-stage builds', 'Containerized test and deploy workflows'],
  },
  {
    id: 'cicd', name: 'GitHub Actions / CI/CD', cat: 'devops', level: 'prod', demo: 'cicd',
    where: 'osApps: AWS + GCP pipelines',
    depth: 'I automated build → test → deploy pipelines with GitHub Actions targeting both AWS and GCP. A failing test stops the pipeline before anything reaches production. Try breaking it in the demo.',
    can: ['GitHub Actions workflow authoring', 'Test gates and fail-fast pipelines', 'Multi-cloud deployment (AWS, GCP)'],
  },
  {
    id: 'bash', name: 'Bash / Linux', cat: 'devops', level: 'project', demo: 'terminal',
    where: 'Daily driver, Kali Linux for security work',
    depth: 'I work in the shell every day for automation, CI scripts and security tooling on Kali. This site has a working terminal: press the ` key or open it from the demo.',
    can: ['Shell scripting & automation', 'Linux administration basics', 'Security tooling on Kali'],
  },

  // ---------- Backend & languages ----------
  {
    id: 'rest', name: 'REST APIs & Ingestion', cat: 'backend', level: 'prod', demo: 'rest',
    where: 'osApps: cross-platform feedback ingestion',
    depth: 'I designed REST APIs and backend services (Node.js/TypeScript, Python) that pull customer feedback from the Apple App Store API, the Google Play Console API and SendGrid, then normalize every source into one standard schema.',
    can: ['API design and implementation', 'Integrating third-party APIs (App Store, Play Console, SendGrid)', 'Normalizing heterogeneous data into one schema'],
  },
  {
    id: 'node', name: 'Node.js / TypeScript', cat: 'backend', level: 'prod', demo: 'polyglot',
    where: 'osApps: backends and web apps',
    depth: 'My main production stack: REST services and responsive web apps in TypeScript on Node.js, backed by MongoDB and hosted on EC2.',
    can: ['Typed backend services', 'Web frontends', 'MongoDB integration'],
  },
  {
    id: 'python', name: 'Python', cat: 'backend', level: 'prod', demo: 'polyglot',
    where: 'osApps backends + computer-vision project',
    depth: 'I use Python for backend services at osApps and for my OpenCV / Tesseract video-analysis pipeline.',
    can: ['Backend services', 'Data processing', 'OpenCV / OCR pipelines'],
  },
  {
    id: 'go', name: 'Go', cat: 'backend', level: 'project', demo: 'iac',
    where: 'IaC risk detection tool',
    depth: 'I wrote my Infrastructure-as-Code security scanner in Go, with Rego policies holding the rules.',
    can: ['CLI tools', 'File parsing and rule evaluation', 'Pairing Go with OPA/Rego'],
  },
  {
    id: 'rego', name: 'Rego (OPA)', cat: 'backend', level: 'project', demo: 'iac',
    where: 'IaC risk detection tool',
    depth: 'Security rules written as Rego policies: detecting unencrypted sub-resources and over-permissive configurations in IaC files.',
    can: ['Policy-as-code', 'Writing deny rules over structured config'],
  },
  {
    id: 'java', name: 'Java', cat: 'backend', level: 'academic', demo: 'polyglot',
    where: 'Open University: Java Programming',
    depth: 'Java was the main language of my B.Sc.: OOP, data structures and algorithms coursework.',
    can: ['Object-oriented design', 'Data structures & algorithms'],
  },
  {
    id: 'cpp', name: 'C / C++', cat: 'backend', level: 'academic', demo: 'polyglot',
    where: 'Coursework + CTF binary exploitation',
    depth: 'C and C++ come from Computer Architecture and Operating Systems coursework, and from binary exploitation challenges in CTFs, where you have to understand memory at the byte level.',
    can: ['Memory model & pointers', 'Reading low-level code for exploitation'],
  },
  {
    id: 'sql', name: 'SQL / MongoDB', cat: 'backend', level: 'prod', demo: 'sql',
    where: 'BigQuery analytics, MongoDB web apps',
    depth: 'I write SQL for analytics in BigQuery and use NoSQL (MongoDB) for web application data.',
    can: ['Analytical SQL', 'Document modelling in MongoDB'],
  },

  // ---------- Mobile ----------
  {
    id: 'swift', name: 'Swift / SwiftUI', cat: 'mobile', level: 'prod', demo: 'firebase',
    where: 'osApps: QA bug-monitoring app (iOS)',
    depth: 'I engineered a dedicated QA-management app in Xcode with SwiftUI, connected to Firebase so developers and QA share live bug state.',
    can: ['SwiftUI apps', 'Real-time data binding', 'Xcode tooling'],
  },
  {
    id: 'android', name: 'Android Studio', cat: 'mobile', level: 'prod', demo: 'firebase',
    where: 'osApps: QA app, Android side',
    depth: 'The Android side of the QA tool, kept in sync with iOS through the same Firebase backend.',
    can: ['Android tooling', 'Cross-platform parity'],
  },
  {
    id: 'crossplatform', name: 'Cross-Platform & In-App Integrations', cat: 'mobile', level: 'prod', demo: 'rest',
    where: 'osApps: app ecosystem',
    depth: 'I work across the whole mobile ecosystem: the apps themselves, plus the store APIs (App Store, Google Play Console) that feed data back into the backend.',
    can: ['Store API integrations', 'Keeping iOS and Android behaviour consistent'],
  },

  // ---------- AI ----------
  {
    id: 'multillm', name: 'Multi-LLM Verification', cat: 'ai', level: 'prod', demo: 'llm',
    where: 'osApps: research & validation protocol',
    depth: 'I set up a validation protocol that sends technical findings, codebase changes and AI-generated insights to several models (Claude, Gemini, ChatGPT, Grok) and compares their answers before anything reaches production. Where the models disagree, a human verifies.',
    can: ['Cross-model fact-checking', 'Consensus benchmarking', 'Hallucination auditing'],
  },
  {
    id: 'hybrid', name: 'Deterministic AI Analytics', cat: 'ai', level: 'prod', demo: 'hybrid',
    where: 'osApps: AI-powered analytics engine',
    depth: 'The core design rule: the LLMs (Claude, Grok) only extract, translate and parse sentiment. Every computation, decision and statistic runs in in-house backend code, so AI bias or hallucination can\'t reach the numbers.',
    can: ['Clear boundaries between LLM work and code', 'Structured extraction', 'Deterministic statistics on AI-parsed data'],
  },
  {
    id: 'prompt', name: 'Prompt Engineering', cat: 'ai', level: 'prod', demo: 'hybrid',
    where: 'Extraction, translation, sentiment prompts',
    depth: 'I write prompts that return strictly structured output, so the deterministic code downstream can check and consume it.',
    can: ['Structured-output prompts', 'Output validation'],
  },
  {
    id: 'agentic', name: 'Agentic Systems (Cursor, Lovable)', cat: 'ai', level: 'prod', demo: 'llm',
    where: 'Daily engineering workflow',
    depth: 'I use agentic coding tools heavily, and I cross-verify their output with other models and keep deterministic control over core system logic.',
    can: ['AI-assisted development', 'Reviewing and auditing agent output'],
  },
  {
    id: 'studio', name: 'Generative UI Tooling', cat: 'ai', level: 'prod', demo: 'compress',
    where: 'osApps: "Studio System"',
    depth: 'I built a Studio System that connects specialized media APIs for automated UI-asset generation, then runs the results through compression pipelines. The demo re-compresses this site\'s portrait live.',
    can: ['Media API integration', 'Asset compression pipelines'],
  },

  // ---------- Security ----------
  {
    id: 'protopollution', name: 'Prototype Pollution', cat: 'security', level: 'project', demo: 'pollution',
    where: 'Security research: Express / EJS',
    depth: 'I researched and demonstrated XSS and RCE through server-side prototype pollution in Node.js Express/EJS environments. The demo runs a vulnerable merge and a safe merge in a sandboxed model, so you can see the pollution happen and see it blocked.',
    can: ['Finding pollution sinks (unsafe merges / deep-sets)', 'Chaining pollution to gadgets', 'Remediation: key blocking, null-prototype objects, schema validation'],
  },
  {
    id: 'iac', name: 'IaC Auditing', cat: 'security', level: 'project', demo: 'iac',
    where: 'Own tool: Go + Rego',
    depth: 'I built a scanner that audits Infrastructure-as-Code for unencrypted sub-resources and excessive permissions. The demo is a small version of it: edit the Terraform and it rescans.',
    can: ['Misconfiguration detection', 'Least-privilege review', 'Policy-as-code rules'],
  },
  {
    id: 'network', name: 'TCP/IP & Wireshark', cat: 'security', level: 'project', demo: 'tcp',
    where: 'Network Security coursework + CTFs',
    depth: 'Packet-level understanding: handshakes, sequence/ack numbers, what a capture looks like in Wireshark. Step through a real TCP conversation in the demo.',
    can: ['Traffic analysis', 'Protocol debugging', 'Reading captures'],
  },
  {
    id: 'ctf', name: 'CTF (picoCTF, TryHackMe)', cat: 'security', level: 'project', demo: 'ctf',
    where: 'Active participant',
    depth: 'I compete in picoCTF and TryHackMe, focused on binary exploitation and web application security. There\'s a small challenge in the demo if you want to try one.',
    can: ['Binary exploitation', 'Web app security', 'Encoding / crypto puzzles'],
  },
  {
    id: 'owasp', name: 'OWASP Top 10 & Vuln Assessment', cat: 'security', level: 'project', demo: 'pollution',
    where: 'Security research',
    depth: 'I use the OWASP Top 10 as the baseline when I assess web applications, and I\'ve done hands-on work on injection and XSS classes.',
    can: ['Web vulnerability assessment', 'Secure-coding review'],
  },
  {
    id: 'kali', name: 'Kali Linux', cat: 'security', level: 'project', demo: 'terminal',
    where: 'Security research environment',
    depth: 'My environment for security research and CTF tooling.',
    can: ['Recon & exploitation tooling'],
  },

  // ---------- Vision ----------
  {
    id: 'opencv', name: 'OpenCV Motion Detection', cat: 'vision', level: 'project', demo: 'motion',
    where: 'Video Analysis Script (Python)',
    depth: 'I built a computer-vision pipeline for real-time motion detection. The demo runs the same core idea live in your browser (frame differencing, thresholding, bounding boxes), optionally on your own webcam.',
    can: ['Frame differencing & thresholding', 'Contour / region detection', 'Real-time video processing'],
  },
  {
    id: 'ocr', name: 'Tesseract OCR + Fuzzy Matching', cat: 'vision', level: 'project', demo: 'fuzzy',
    where: 'Video Analysis Script (Python)',
    depth: 'OCR output is noisy (0 for O, 1 for l), so the pipeline fuzzy-matches recognized text against known values. The demo computes the edit-distance matching live.',
    can: ['OCR pipelines', 'Levenshtein / fuzzy string matching'],
  },

  // ---------- CS & IT ----------
  {
    id: 'algo', name: 'Algorithms & Data Structures', cat: 'cs', level: 'academic', demo: 'sort',
    where: 'B.Sc. Computer Science',
    depth: 'Core coursework from my B.Sc. The demo is a sorting visualizer that counts comparisons, so you can see the complexity differences directly.',
    can: ['Complexity analysis', 'Classic algorithms and structures'],
  },
  {
    id: 'os', name: 'Operating Systems & Architecture', cat: 'cs', level: 'academic', demo: null,
    where: 'B.Sc. Computer Science',
    depth: 'Processes, scheduling, memory management and how the CPU executes code. This is the background behind my binary-exploitation work and my debugging of low-level issues.',
    can: ['Systems reasoning', 'Low-level debugging'],
  },
  {
    id: 'ad', name: 'Active Directory & IT Support', cat: 'cs', level: 'it', demo: null,
    where: 'Bank Leumi (2018–19), Dr. PC (2019–20)',
    depth: 'At Bank Leumi I gave Tier-1 support for internal banking systems under strict security protocols and managed Active Directory permissions for least-privilege access. At Dr. PC I did hardware/software diagnostics and Windows patch management.',
    can: ['Least-privilege access management', 'Operating under strict security protocols', 'Hardware / OS diagnostics'],
  },
];
