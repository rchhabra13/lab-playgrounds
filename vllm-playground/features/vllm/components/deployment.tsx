import { CommandBlock } from '@/components/lab/command-block';

const local = `source ~/.venv-vllm-metal/bin/activate
vllm serve Qwen/Qwen2.5-3B-Instruct \\
  --max-model-len 4096`;

const docker = `docker run --runtime nvidia --gpus all \\
  -v ~/.cache/huggingface:/root/.cache/huggingface \\
  --env "HF_TOKEN=$HF_TOKEN" \\
  -p 8000:8000 \\
  --ipc=host \\
  vllm/vllm-openai:latest \\
  --model Qwen/Qwen2.5-3B-Instruct`;

const k8s = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: vllm-server
spec:
  replicas: 1
  selector:
    matchLabels:
      app: vllm
  template:
    metadata:
      labels:
        app: vllm
    spec:
      containers:
        - name: vllm
          image: vllm/vllm-openai:latest
          args: ["--model", "Qwen/Qwen2.5-3B-Instruct"]
          ports:
            - containerPort: 8000
          resources:
            limits:
              nvidia.com/gpu: "1"
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 60
---
apiVersion: v1
kind: Service
metadata:
  name: vllm-server
spec:
  selector:
    app: vllm
  ports:
    - port: 8000
      targetPort: 8000`;

const kubectl = `kubectl apply -f vllm-deployment.yaml
kubectl rollout status deployment/vllm-server
kubectl port-forward svc/vllm-server 8000:8000`;

const statefulset = `apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: vllm-server
spec:
  serviceName: vllm-server
  replicas: 1
  selector:
    matchLabels:
      app: vllm
  template:
    metadata:
      labels:
        app: vllm
    spec:
      containers:
        - name: vllm
          image: vllm/vllm-openai:latest
          args: ["--model", "Qwen/Qwen2.5-3B-Instruct"]
          ports:
            - containerPort: 8000
          resources:
            limits:
              nvidia.com/gpu: "1"
          volumeMounts:
            - name: hf-cache
              mountPath: /root/.cache/huggingface
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 60
  volumeClaimTemplates:
    - metadata:
        name: hf-cache
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi`;

export function Deployment() {
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">vLLM</div>
          <h1>Deployment</h1>
          <p>
            The same server runs three ways. This Mac uses the local Metal build.
            Docker and Kubernetes run the official CUDA image on a GPU host. These
            commands come from the vLLM docs. This app does not run them.
          </p>
        </div>
        <span className="badge">Reference</span>
      </div>

      <section className="panel">
        <div className="panel-head">Local (Apple Silicon, Metal)</div>
        <div className="panel-body reference-snippets">
          <p className="hint">
            The build already installed on this Mac. This is the server the lab
            connects to. Start it with ./start.command, or serve it directly.
          </p>
          <CommandBlock title="Serve locally" command={local} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Docker</div>
        <div className="panel-body reference-snippets">
          <p className="hint">
            The official vllm/vllm-openai image needs an NVIDIA GPU and the
            NVIDIA container toolkit. It does not run on Apple Silicon.
          </p>
          <CommandBlock title="Run the container" command={docker} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Kubernetes: Deployment</div>
        <div className="panel-body reference-snippets">
          <p className="hint">
            A Deployment and Service on a cluster with GPU nodes. The readiness
            probe holds traffic until the model finishes loading. Use a
            Deployment when the pods are interchangeable and hold no local state.
          </p>
          <CommandBlock title="Deployment and Service" command={k8s} />
          <CommandBlock title="Apply and forward the port" command={kubectl} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Kubernetes: StatefulSet</div>
        <div className="panel-body reference-snippets">
          <p className="hint">
            Use a StatefulSet when each pod needs a stable identity and its own
            persistent volume. A volumeClaimTemplate gives each replica a durable
            model cache, so a restart reuses the downloaded weights instead of
            fetching them again. This also fits tensor-parallel replicas that
            need stable network names.
          </p>
          <CommandBlock title="StatefulSet with a model cache" command={statefulset} />
        </div>
      </section>

      <section className="panel reference-docs">
        <div className="panel-head">Official documentation</div>
        <div className="panel-body">
          <div className="reference-links">
            <a
              className="source-link"
              href="https://docs.vllm.ai/en/latest/deployment/docker.html"
              target="_blank"
              rel="noreferrer"
            >
              Deploy with Docker ↗
            </a>
            <a
              className="source-link"
              href="https://docs.vllm.ai/en/latest/deployment/k8s.html"
              target="_blank"
              rel="noreferrer"
            >
              Deploy on Kubernetes ↗
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
