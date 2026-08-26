"""Start both local services and clean up only the processes we own."""
import os, signal, socket, subprocess, sys, time, urllib.request
from pathlib import Path
root=Path(__file__).resolve().parents[1]
processes=[]
try:
    for port in [3000,8787]:
        with socket.socket() as sock:
            sock.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1)
            try: sock.bind(('127.0.0.1',port))
            except OSError:
                sys.exit(f'Port {port} is already in use. Stop the previous Inference Lab session first.')
    backend=subprocess.Popen([sys.executable,'-m','uvicorn','backend.server:app','--host','127.0.0.1','--port','8787'],cwd=root,start_new_session=True)
    processes.append(backend)
    for _ in range(60):
        if backend.poll() is not None: sys.exit('The local controller failed to start. See the error above.')
        try:
            with urllib.request.urlopen('http://127.0.0.1:8787/lab-api/status',timeout=3): break
        except OSError: time.sleep(.5)
    else: sys.exit('Controller startup timed out.')
    ui=subprocess.Popen(['npm','run','dev'],cwd=root,start_new_session=True);processes.insert(0,ui)
    print('\nInference Lab: http://127.0.0.1:3000\nPress Ctrl+C to stop the lab and its model server.\n',flush=True)
    while all(p.poll() is None for p in processes):time.sleep(.5)
except KeyboardInterrupt: pass
finally:
    for p in processes:
        if p.poll() is None:
            os.killpg(p.pid,signal.SIGINT)
            try:p.wait(timeout=15)
            except subprocess.TimeoutExpired:
                os.killpg(p.pid,signal.SIGKILL);p.wait()
