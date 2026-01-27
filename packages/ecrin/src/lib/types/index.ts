// Application

interface Fetch {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  (input: string | URL | globalThis.Request, init?: RequestInit): Promise<Response>;
}

interface Log {
  meta: { id: string; createdAt: string; source: string };
  context?: unknown;
  done?: boolean;
  result?: unknown;
  error?: boolean;
  details?: unknown;
}

// Graphology

interface Node {
  id: string;
  opts: {
    type?: 'circle' | 'square';
    size?: number;
    color?: string;
    label?: string;
    hidden?: boolean;
    forceLabel?: boolean;
    zIndex?: number;
  };
}

interface Edge {
  source: string;
  target: string;
  opts: {
    type?: 'line' | 'arrow' | 'curve';
    size?: number;
    color?: string;
    label?: string;
    hidden?: boolean;
    forceLabel?: boolean;
    zIndex?: number;
  };
}

// REDCap

interface EAV {
  record: string;
  redcap_repeat_instrument: string;
  redcap_repeat_instance: string | number;
  field_name: string;
  value: string;
}

interface User {
  id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  orcid: string;
  mail: string;
  ecr___1: string;
  ecr___2: string;
  ecr___3: string;
  ecr1_topic1: string;
  ecr1_topic2: string;
  ecr1_topic3: string;
  ecr1_topic4: string;
  ecr1_topic5: string;
  ecr1_topic1_k1: string;
  ecr1_topic1_k2: string;
  ecr1_topic1_k3: string;
  ecr1_topic2_k1: string;
  ecr1_topic2_k2: string;
  ecr1_topic2_k3: string;
  ecr1_topic3_k1: string;
  ecr1_topic3_k2: string;
  ecr1_topic3_k3: string;
  ecr1_topic4_k1: string;
  ecr1_topic4_k2: string;
  ecr1_topic4_k3: string;
  ecr1_topic5_k1: string;
  ecr1_topic5_k2: string;
  ecr1_topic5_k3: string;
  ecr1_topic_other_k1: string;
  ecr1_topic_other_k2: string;
  ecr1_topic_other_k3: string;
  ecr1_topic_other_k4: string;
  ecr1_topic_other_k5: string;
  ecr1_method1: string;
  ecr1_method2: string;
  ecr1_method3: string;
  ecr1_method4: string;
  ecr1_method5: string;
  ecr1_method1_k1: string;
  ecr1_method1_k2: string;
  ecr1_method1_k3: string;
  ecr1_method2_k1: string;
  ecr1_method2_k2: string;
  ecr1_method2_k3: string;
  ecr1_method3_k1: string;
  ecr1_method3_k2: string;
  ecr1_method3_k3: string;
  ecr1_method4_k1: string;
  ecr1_method4_k2: string;
  ecr1_method4_k3: string;
  ecr1_method5_k1: string;
  ecr1_method5_k2: string;
  ecr1_method5_k3: string;
  ecr1_method_other_k1: string;
  ecr1_method_other_k2: string;
  ecr1_method_other_k3: string;
  ecr1_method_other_k4: string;
  ecr1_method_other_k5: string;
  ecr1_area1: string;
  ecr1_area2: string;
  ecr1_area3: string;
  ecr1_area4: string;
  ecr1_area5: string;
  ecr2_topic1: string;
  ecr2_topic2: string;
  ecr2_topic3: string;
  ecr2_topic4: string;
  ecr2_topic5: string;
  ecr2_topic1_k1: string;
  ecr2_topic1_k2: string;
  ecr2_topic1_k3: string;
  ecr2_topic2_k1: string;
  ecr2_topic2_k2: string;
  ecr2_topic2_k3: string;
  ecr2_topic3_k1: string;
  ecr2_topic3_k2: string;
  ecr2_topic3_k3: string;
  ecr2_topic4_k1: string;
  ecr2_topic4_k2: string;
  ecr2_topic4_k3: string;
  ecr2_topic5_k1: string;
  ecr2_topic5_k2: string;
  ecr2_topic5_k3: string;
  ecr2_topic_other_k1: string;
  ecr2_topic_other_k2: string;
  ecr2_topic_other_k3: string;
  ecr2_topic_other_k4: string;
  ecr2_topic_other_k5: string;
  ecr2_method1: string;
  ecr2_method2: string;
  ecr2_method3: string;
  ecr2_method4: string;
  ecr2_method5: string;
  ecr2_method1_k1: string;
  ecr2_method1_k2: string;
  ecr2_method1_k3: string;
  ecr2_method2_k1: string;
  ecr2_method2_k2: string;
  ecr2_method2_k3: string;
  ecr2_method3_k1: string;
  ecr2_method3_k2: string;
  ecr2_method3_k3: string;
  ecr2_method4_k1: string;
  ecr2_method4_k2: string;
  ecr2_method4_k3: string;
  ecr2_method5_k1: string;
  ecr2_method5_k2: string;
  ecr2_method5_k3: string;
  ecr2_method_other_k1: string;
  ecr2_method_other_k2: string;
  ecr2_method_other_k3: string;
  ecr2_method_other_k4: string;
  ecr2_method_other_k5: string;
  ecr2_area1: string;
  ecr2_area2: string;
  ecr2_area3: string;
  ecr2_area4: string;
  ecr2_area5: string;
  ecr3_topic1: string;
  ecr3_topic2: string;
  ecr3_topic3: string;
  ecr3_topic4: string;
  ecr3_topic5: string;
  ecr3_topic1_k1: string;
  ecr3_topic1_k2: string;
  ecr3_topic1_k3: string;
  ecr3_topic2_k1: string;
  ecr3_topic2_k2: string;
  ecr3_topic2_k3: string;
  ecr3_topic3_k1: string;
  ecr3_topic3_k2: string;
  ecr3_topic3_k3: string;
  ecr3_topic4_k1: string;
  ecr3_topic4_k2: string;
  ecr3_topic4_k3: string;
  ecr3_topic5_k1: string;
  ecr3_topic5_k2: string;
  ecr3_topic5_k3: string;
  ecr3_topic_other_k1: string;
  ecr3_topic_other_k2: string;
  ecr3_topic_other_k3: string;
  ecr3_topic_other_k4: string;
  ecr3_topic_other_k5: string;
  ecr3_method1: string;
  ecr3_method2: string;
  ecr3_method3: string;
  ecr3_method4: string;
  ecr3_method5: string;
  ecr3_method1_k1: string;
  ecr3_method1_k2: string;
  ecr3_method1_k3: string;
  ecr3_method2_k1: string;
  ecr3_method2_k2: string;
  ecr3_method2_k3: string;
  ecr3_method3_k1: string;
  ecr3_method3_k2: string;
  ecr3_method3_k3: string;
  ecr3_method4_k1: string;
  ecr3_method4_k2: string;
  ecr3_method4_k3: string;
  ecr3_method5_k1: string;
  ecr3_method5_k2: string;
  ecr3_method5_k3: string;
  ecr3_method_other_k1: string;
  ecr3_method_other_k2: string;
  ecr3_method_other_k3: string;
  ecr3_method_other_k4: string;
  ecr3_method_other_k5: string;
  ecr3_area1: string;
  ecr3_area2: string;
  ecr3_area3: string;
  ecr3_area4: string;
  ecr3_area5: string;
  eunicoast___1: string;
  eunicoast___2: string;
  eunicoast___3: string;
  eunicoast___4: string;
  eunicoast___5: string;
  your_upcoming_projects_complete: string;
}

export type { Log, EAV, Node, Edge, User, Fetch };
