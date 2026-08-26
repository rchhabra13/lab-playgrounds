"""Loopback-only controller. Only curated scripts and fixed server commands execute."""
import asyncio, json, os, signal, sys, shlex
from collections import deque
from pathlib import Path
import platform
import importlib.metadata
import httpx
import anyio
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
MODEL = 'mlx-community/Qwen2.5-3B-Instruct-4bit'
BASE = 'http://127.0.0.1:8000'
DEMOS = {'chat','stream','completion','sampling','batch','json','tools','offline','context','cache'}
app = FastAPI()
server = None
logs = deque(maxlen=250)
lock = asyncio.Lock()
active = set()
metal_available = False

@app.on_event("startup")
async def hardware_check():
    global metal_available
    proc = await asyncio.create_subprocess_exec(sys.executable, "-c", "import torch; print(torch.backends.mps.is_available())", stdout=asyncio.subprocess.PIPE)
    output, _ = await proc.communicate()
    metal_available = output.strip() == b"True"


def script_command():
    return [sys.executable, '-u', str(ROOT/'examples'/'run_demo.py'), '--stdin']

class RuntimeConfig(BaseModel):
    model:str=Field(default=MODEL,pattern=r'^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')
    max_model_len:int=Field(default=4096,ge=512,le=32768)
    max_num_seqs:int=Field(default=4,ge=1,le=16)
    memory_fraction:float=Field(default=.35,ge=.1,le=.8)

config_file=ROOT/'work'/'runtime.json'
runtime=RuntimeConfig()
try:
    if config_file.exists(): runtime=RuntimeConfig.model_validate_json(config_file.read_text())
except (ValueError,OSError): pass

def command():
    return [sys.executable,'-m','vllm.entrypoints.cli.main','serve',runtime.model,'--served-model-name','local-qwen','--host','127.0.0.1','--port','8000','--max-model-len',str(runtime.max_model_len),'--max-num-seqs',str(runtime.max_num_seqs),'--enable-auto-tool-choice','--tool-call-parser','hermes']

def command_text(): return f'VLLM_METAL_MEMORY_FRACTION={runtime.memory_fraction} '+shlex.join(command())

@app.get('/lab-api/configuration')
async def configuration(): return {'settings':runtime.model_dump(),'command':command_text()}

@app.post('/lab-api/configuration')
async def configure(value:RuntimeConfig):
    global runtime
    async with lock:
        if active or (server and server.returncode is None): raise HTTPException(409,'Stop the lab-owned server and finish active runs before changing startup settings.')
        config_file.parent.mkdir(exist_ok=True)
        temporary=config_file.with_suffix('.tmp');temporary.write_text(value.model_dump_json());temporary.replace(config_file)
        runtime=value
    return await configuration()

@app.get('/lab-api/evidence')
async def evidence():
    versions={}
    for name in ['vllm','vllm-metal','mlx','mlx-lm']:
        try: versions[name]=importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError: versions[name]=None
    result={'controller_environment':{'python':platform.python_version(),'os':platform.platform(),'architecture':platform.machine(),'packages':versions},'configured_startup':runtime.model_dump(),'server_version':None,'models':None,'metrics':None}
    async with httpx.AsyncClient(timeout=3) as client:
        for key,path in [('server_version','/version'),('models','/v1/models'),('metrics','/metrics')]:
            try:
                r=await client.get(BASE+path)
                if r.is_success: result[key]=r.text[:100000] if key=='metrics' else r.json()
            except (httpx.HTTPError,ValueError): pass
    return result

@app.middleware('http')
async def local_only(request:Request, call_next):
    # Reject browser requests from other websites, including cross-site form submissions.
    origin = request.headers.get('origin')
    if request.headers.get('host','').split(':')[0] not in {'127.0.0.1','localhost','testserver'}:
        from fastapi.responses import JSONResponse
        return JSONResponse({'detail':'Invalid host'},status_code=403)
    if origin and origin not in {'http://127.0.0.1:3000','http://localhost:3000','http://127.0.0.1:8787'}:
        from fastapi.responses import JSONResponse
        return JSONResponse({'detail':'Only the local Inference Lab UI can control this service.'},status_code=403)
    return await call_next(request)

async def state():
    ready, model = False, None
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            r = await client.get(BASE+'/v1/models')
            if r.is_success:
                data=r.json().get('data',[])
                ready=bool(data)
                model=data[0]['id'] if data else None
    except (httpx.HTTPError,ValueError): pass
    owned=server is not None and server.returncode is None
    return {'ready':ready,'model':model,'owned':owned,'state':'ready' if ready else 'starting' if owned else 'offline','logs':list(logs),'command':command_text(),'active_runs':len(active),'metal_available':metal_available}

@app.get('/lab-api/status')
async def status(): return await state()

async def capture(proc):
    async for line in proc.stdout:
        logs.append(line.decode(errors='replace').rstrip())
    await proc.wait()
    logs.append(f'Server exited with code {proc.returncode}.')

async def stop_process(proc):
    if proc.returncode is None:
        try: os.killpg(proc.pid,signal.SIGTERM)
        except ProcessLookupError: return
        try: await asyncio.wait_for(proc.wait(),8)
        except asyncio.TimeoutError:
            try: os.killpg(proc.pid,signal.SIGKILL)
            except ProcessLookupError: pass
            await proc.wait()

@app.post('/lab-api/server/start')
async def start():
    global server
    async with lock:
        current=await state()
        if current['ready'] or current['owned']: return current
        if not metal_available: raise HTTPException(409,'Metal is unavailable to this process. Run ./start.command in your regular macOS Terminal, outside the Codex sandbox.')
        if active: raise HTTPException(409,'Finish the running script before starting the model server.')
        env={**os.environ,'VLLM_METAL_MEMORY_FRACTION':str(runtime.memory_fraction)}
        logs.clear()
        server=await asyncio.create_subprocess_exec(*command(),stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT,env=env,start_new_session=True)
        asyncio.create_task(capture(server))
    return await state()

@app.post('/lab-api/server/stop')
async def stop():
    async with lock:
        if server is None or server.returncode is not None:
            raise HTTPException(409,'This server was not started by Inference Lab. Stop it in its terminal.')
        if active: raise HTTPException(409,'Cancel the active demo before stopping the server.')
        await stop_process(server)
    return await state()

class Run(BaseModel):
    demo:str
    prompt:str=Field(min_length=1,max_length=12000)
    system:str=Field(default='You are a helpful, concise assistant.',max_length=4000)
    temperature:float=Field(default=0.7,ge=0,le=2)
    max_tokens:int=Field(default=256,ge=16,le=1024)
    messages:list[dict]=Field(default_factory=list,max_length=30)

@app.get('/lab-api/source/{demo}')
async def source(demo:str):
    if demo not in DEMOS: raise HTTPException(404,'Unknown demo')
    return {'code':(ROOT/'examples'/'run_demo.py').read_text(),'command':'VLLM_METAL_MEMORY_FRACTION=0.35 '+shlex.join(script_command())}

@app.post('/lab-api/run')
async def run(config:Run):
    if config.demo not in DEMOS: raise HTTPException(400,'Unknown demo')
    for m in config.messages:
        if m.get('role') not in {'user','assistant'} or not isinstance(m.get('content'),str) or len(m['content'])>16000:
            raise HTTPException(400,'Invalid conversation message')
    async with lock:
        if active: raise HTTPException(409,'A demo is already running. Cancel it or wait for it to finish.')
        current=await state()
        if config.demo=='offline' and not metal_available:
            raise HTTPException(409,'Metal is unavailable. Launch Inference Lab from your regular macOS Terminal.')
        if config.demo=='offline' and (current['ready'] or current['owned']):
            raise HTTPException(409,'Stop the model server before offline inference, which loads its own model.')
        if config.demo!='offline' and not current['ready']:
            raise HTTPException(409,'Start vLLM and wait for the model to be ready.')
        payload={**config.model_dump(),'model':current['model'] or MODEL}
        proc=await asyncio.create_subprocess_exec(*script_command(),stdin=asyncio.subprocess.PIPE,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.STDOUT,start_new_session=True,env={**os.environ,'VLLM_METAL_MEMORY_FRACTION':'0.35'})
        active.add(proc)
        proc.stdin.write(json.dumps(payload).encode()); await proc.stdin.drain(); proc.stdin.close()
    async def events():
        try:
            yield json.dumps({'type':'evidence','snapshot':await evidence()})+'\n'
            yield json.dumps({'type':'execution','command':'VLLM_METAL_MEMORY_FRACTION=0.35 '+shlex.join(script_command()),'settings':payload})+'\n'
            async for raw in proc.stdout:
                line=raw.decode(errors='replace').strip()
                try:
                    data=json.loads(line)
                    if not isinstance(data,dict) or 'type' not in data: raise ValueError()
                except (ValueError,TypeError): data={'type':'log','text':line}
                yield json.dumps(data)+'\n'
            await proc.wait()
            yield json.dumps({'type':'exit','code':proc.returncode})+'\n'
        finally:
            with anyio.CancelScope(shield=True):
                await stop_process(proc)
                active.discard(proc)
    return StreamingResponse(events(),media_type='application/x-ndjson')

@app.on_event('shutdown')
async def shutdown():
    for proc in list(active): await stop_process(proc)
    if server: await stop_process(server)
