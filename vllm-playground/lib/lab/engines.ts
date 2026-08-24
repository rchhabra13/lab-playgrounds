/**
 * Module catalog for the lab. One engine executes locally (vLLM). The rest are
 * reference modules: a short theory summary and links to the official
 * documentation. A reference module never installs or starts anything.
 */
export type Guide = {
  overview: string;
  docs: { label: string; url: string }[];
};

export type Engine = {
  id: string;
  name: string;
  group: string;
  description: string;
  status: 'live' | 'reference';
  available: boolean;
  purpose: string;
  guide?: Guide;
};

export const engines: Engine[] = [
  {
    id: 'vllm',
    name: 'vLLM',
    group: 'Inference engines',
    description: 'Live · local Metal',
    status: 'live',
    available: true,
    purpose:
      'Run models, inspect generation, and experiment with request scheduling on this Mac.',
  },
  {
    id: 'sglang',
    name: 'SGLang',
    group: 'Inference engines',
    description: 'Reference · inference engine',
    status: 'reference',
    available: false,
    purpose:
      'A serving engine whose RadixAttention reuses shared prefixes automatically across requests.',
    guide: {
      overview:
        'SGLang is a serving engine for language and vision-language models. Its RadixAttention runtime stores the key-value cache of processed prefixes in a radix tree and reuses it when a new request shares a prefix, which helps repeated system prompts and multi-turn chat. It serves an OpenAI-compatible API and constrains structured output with a finite-state machine.',
      docs: [
        {
          label: 'SGLang quickstart',
          url: 'https://docs.sglang.io/get_started/install.html',
        },
        { label: 'SGLang GitHub', url: 'https://github.com/sgl-project/sglang' },
      ],
    },
  },
  {
    id: 'tensorrt',
    name: 'TensorRT-LLM',
    group: 'Inference engines',
    description: 'Reference · NVIDIA inference',
    status: 'reference',
    available: false,
    purpose:
      'NVIDIA inference on compiled engines, served through an OpenAI-compatible endpoint.',
    guide: {
      overview:
        'TensorRT-LLM runs language models on NVIDIA GPUs. It compiles an optimized execution engine for the target GPU, applying kernel selection, quantization, and fusion before serving. A Python LLM API runs generation from a script, and trtllm-serve starts an OpenAI-compatible server. It requires NVIDIA hardware and does not run on Apple Silicon.',
      docs: [
        {
          label: 'TensorRT-LLM quick start',
          url: 'https://nvidia.github.io/TensorRT-LLM/quick-start-guide.html',
        },
        {
          label: 'TensorRT-LLM GitHub',
          url: 'https://github.com/NVIDIA/TensorRT-LLM',
        },
      ],
    },
  },
  {
    id: 'llmd',
    name: 'llm-d',
    group: 'Distributed serving',
    description: 'Reference · Kubernetes serving',
    status: 'reference',
    available: false,
    purpose:
      'A Kubernetes-native serving stack that routes, caches, and disaggregates vLLM workers at scale.',
    guide: {
      overview:
        'llm-d is a distributed inference stack for Kubernetes, built on vLLM and now a CNCF Sandbox project. It adds prefix-cache and load-aware routing, tiered key-value cache offloading to CPU or disk, and disaggregated prefill and decode across separate pods. Its routing builds on the Gateway API Inference Extension. Running it requires a Kubernetes cluster with GPU nodes.',
      docs: [
        {
          label: 'llm-d quickstart',
          url: 'https://llm-d.ai/docs/getting-started/quickstart',
        },
        { label: 'llm-d GitHub', url: 'https://github.com/llm-d/llm-d' },
      ],
    },
  },
  {
    id: 'dynamo',
    name: 'NVIDIA Dynamo',
    group: 'Distributed serving',
    description: 'Reference · distributed inference',
    status: 'reference',
    available: false,
    purpose:
      'A datacenter-scale framework that coordinates a frontend, router, and workers over a chosen backend.',
    guide: {
      overview:
        'NVIDIA Dynamo is a distributed inference framework for datacenter-scale serving. It coordinates a frontend, a router, and workers, and runs on top of a backend engine such as vLLM, SGLang, or TensorRT-LLM. It disaggregates prefill and decode, routes with key-value cache awareness, and autoscales workers. It targets multi-node GPU deployments.',
      docs: [
        {
          label: 'Dynamo quickstart',
          url: 'https://docs.nvidia.com/dynamo/latest/getting-started/quickstart.html',
        },
        { label: 'Dynamo GitHub', url: 'https://github.com/ai-dynamo/dynamo' },
      ],
    },
  },
  {
    id: 'gateway',
    name: 'Gateway API Inference Extension',
    group: 'Routing',
    description: 'Reference · endpoint selection',
    status: 'reference',
    available: false,
    purpose:
      'A Kubernetes Gateway API extension that selects a model endpoint using live serving metrics.',
    guide: {
      overview:
        'The Gateway API Inference Extension adds inference-aware routing to the Kubernetes Gateway API. An InferencePool groups the model server pods, and an Endpoint Picker reads live metrics from them, such as queue depth and key-value cache use, to choose an endpoint per request. The gateway then forwards the request to the chosen pod, so routing reflects current load rather than a fixed rule.',
      docs: [
        {
          label: 'Gateway API Inference Extension',
          url: 'https://gateway-api-inference-extension.sigs.k8s.io/',
        },
        {
          label: 'Introduction (Kubernetes blog)',
          url: 'https://kubernetes.io/blog/2025/06/05/introducing-gateway-api-inference-extension/',
        },
      ],
    },
  },
  {
    id: 'kubernetes',
    name: 'Kubernetes',
    group: 'Platform',
    description: 'Reference · resource management',
    status: 'reference',
    available: false,
    purpose:
      'The platform that schedules model servers onto GPU nodes and keeps them running.',
    guide: {
      overview:
        'Kubernetes is the platform under the distributed serving modules. A Deployment or StatefulSet keeps a set of model server pods running and handles rollouts. A pod requests a GPU through the nvidia.com/gpu resource, and a readiness probe holds traffic until the model finishes loading. The other Kubernetes modules here build on these primitives.',
      docs: [
        {
          label: 'Kubernetes Deployments',
          url: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/',
        },
        {
          label: 'Schedule GPUs',
          url: 'https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/',
        },
      ],
    },
  },
  {
    id: 'opentelemetry',
    name: 'OpenTelemetry',
    group: 'Observability',
    description: 'Reference · traces and signals',
    status: 'reference',
    available: false,
    purpose:
      'The standard for traces that connects a request to what the server did while handling it.',
    guide: {
      overview:
        'OpenTelemetry is an open standard for traces, metrics, and logs. vLLM emits traces for it natively, producing a span per inference request with fields such as time in the queue and time spent generating. A collector receives the spans over OTLP and forwards them to a tracing backend, so a slow request can be tied to what the server did.',
      docs: [
        {
          label: 'vLLM OpenTelemetry example',
          url: 'https://docs.vllm.ai/en/stable/examples/online_serving/opentelemetry/',
        },
        { label: 'OpenTelemetry', url: 'https://opentelemetry.io/docs/' },
      ],
    },
  },
];

export const activeEngine = engines[0];
export const moduleGroups = [...new Set(engines.map((e) => e.group))];
