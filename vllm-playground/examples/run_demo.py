"""Curated, runnable adaptations of vLLM examples. No arbitrary code execution.

API examples: https://docs.vllm.ai/en/latest/examples/basic/online_serving/
Offline: https://docs.vllm.ai/en/latest/examples/basic/offline_inference/
JSON: https://docs.vllm.ai/en/latest/features/structured_outputs/
Tools: https://docs.vllm.ai/en/latest/features/tool_calling/

Run directly: python examples/run_demo.py --demo stream --prompt 'Explain KV caching.'
The controller sends settings via stdin; every output line is a JSON event for the UI.
"""
import argparse, asyncio, json, sys, time
import httpx

def emit(kind, **data): print(json.dumps({'type':kind,**data}),flush=True)

def settings():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--stdin',action='store_true')
    p.add_argument('--demo',default='chat',choices=['chat','stream','completion','sampling','batch','json','tools','offline','context','cache'])
    p.add_argument('--prompt',default='Explain KV caching in three sentences.')
    a=p.parse_args()
    return json.load(sys.stdin) if a.stdin else {'demo':a.demo,'prompt':a.prompt,'system':'You are a helpful, concise assistant.','model':'local-qwen','temperature':0.7,'max_tokens':256,'messages':[]}

async def main(c):
    start=time.perf_counter()
    if c['demo']=='offline':
        import torch
        if not torch.backends.mps.is_available():
            raise RuntimeError('Metal is unavailable in this process. Run from a regular macOS Terminal.')
        emit('log',text='Loading a separate model engine. First initialization may take a minute.')
        from vllm import LLM, SamplingParams
        llm=LLM(model='mlx-community/Qwen2.5-3B-Instruct-4bit',max_model_len=4096,max_num_seqs=4)
        outputs=llm.generate([c['prompt']],SamplingParams(temperature=c['temperature'],max_tokens=c['max_tokens']))
        emit('result',label='Offline inference',text=outputs[0].outputs[0].text,seconds=round(time.perf_counter()-start,3),tokens=len(outputs[0].outputs[0].token_ids))
        return
    messages=[{'role':'system','content':c['system']},*c.get('messages',[]),{'role':'user','content':c['prompt']}]
    body={'model':c['model'],'messages':messages,'temperature':c['temperature'],'max_tokens':c['max_tokens']}
    async with httpx.AsyncClient(base_url='http://127.0.0.1:8000',timeout=180) as client:
        async def request(payload,label='Response',path='/v1/chat/completions'):
            emit('request',label=label,path=path,body=payload)
            t=time.perf_counter(); r=await client.post(path,json=payload)
            if not r.is_success: raise RuntimeError(f'vLLM {r.status_code}: {r.text[:1800]}')
            data=r.json(); choice=data['choices'][0]
            text=choice.get('message',{}).get('content') or choice.get('text') or ''
            elapsed=time.perf_counter()-t
            usage=data.get('usage') or {}
            emit('result',label=label,text=text,seconds=round(elapsed,3),tokens=usage.get('completion_tokens'),usage=usage,finish_reason=choice.get('finish_reason'),raw=data)
            return data
        mode=c['demo']
        if mode=='stream':
            payload={**body,'stream':True,'stream_options':{'include_usage':True}}
            emit('request',label='Streaming',path='/v1/chat/completions',body=payload)
            t=time.perf_counter(); first=None; text=''; usage={}; finish=None
            async with client.stream('POST','/v1/chat/completions',json=payload) as response:
                if not response.is_success: raise RuntimeError((await response.aread()).decode()[:1800])
                async for line in response.aiter_lines():
                    if not line.startswith('data: '): continue
                    value=line[6:]
                    if value=='[DONE]': break
                    event=json.loads(value)
                    if event.get('error'): raise RuntimeError(str(event['error']))
                    if event.get('usage'): usage=event['usage']
                    for choice in event.get('choices',[]):
                        chunk=choice.get('delta',{}).get('content') or ''
                        if choice.get('finish_reason'): finish=choice['finish_reason']
                        if chunk:
                            if first is None: first=time.perf_counter()-t
                            text+=chunk; emit('delta',text=chunk,first_seconds=first)
            emit('result',label='Streaming response',text=text,seconds=round(time.perf_counter()-t,3),first_seconds=first,tokens=usage.get('completion_tokens'),usage=usage,finish_reason=finish)
        elif mode in {'context','cache'}:
            paragraph='The inference lab serves local requests, records generation settings, and inspects timing and output. '
            emit('log',text='Timing differences are observations, not proof of cache hits. Exact input tokens are reported in usage. Existing cache state is not reset.')
            if mode=='context':
                for repeats in [1,8,24]:
                    payload={**body,'messages':[{'role':'system','content':c['system']},{'role':'user','content':paragraph*repeats+'\n'+c['prompt']}]}
                    await request(payload,f'Context · {repeats} repeated paragraphs')
            else:
                prefix=paragraph*24
                for n in range(3):
                    payload={**body,'messages':[{'role':'system','content':c['system']},{'role':'user','content':prefix+'\n'+c['prompt']}]}
                    await request(payload,f'Repeated prefix · request {n+1}')
        elif mode=='completion':
            await request({k:v for k,v in {**body,'prompt':c['prompt']}.items() if k!='messages'},'Text continuation','/v1/completions')
        elif mode=='sampling':
            await asyncio.gather(*(request({**body,'temperature':temp},f'Temperature {temp}') for temp in [0.0,0.7,1.2]))
        elif mode=='batch':
            prompts=[p.strip() for p in c['prompt'].splitlines() if p.strip()]
            if not 1<=len(prompts)<=4: raise ValueError('Enter 1 to 4 prompts, one per line.')
            await asyncio.gather(*(request({**body,'messages':[{'role':'system','content':c['system']},{'role':'user','content':p}]},f'Prompt {i+1}: {p}') for i,p in enumerate(prompts)))
        elif mode=='json':
            schema={'type':'object','properties':{'title':{'type':'string'},'summary':{'type':'string'},'tags':{'type':'array','items':{'type':'string'}}},'required':['title','summary','tags'],'additionalProperties':False}
            data=await request({**body,'response_format':{'type':'json_schema','json_schema':{'name':'summary','strict':True,'schema':schema}}},'Structured JSON')
            import jsonschema
            obj=json.loads(data['choices'][0]['message']['content']); jsonschema.validate(obj,schema)
            emit('log',text='Validated: title and summary are strings, tags is a list of strings, and there are no extra fields.')
        elif mode=='tools':
            tool={'type':'function','function':{'name':'celsius_to_fahrenheit','description':'Convert a temperature in Celsius to Fahrenheit.','parameters':{'type':'object','properties':{'celsius':{'type':'number'}},'required':['celsius'],'additionalProperties':False}}}
            data=await request({**body,'tools':[tool],'tool_choice':{'type':'function','function':{'name':'celsius_to_fahrenheit'}}},'1 · Model requests a tool')
            msg=data['choices'][0]['message']; calls=msg.get('tool_calls') or []
            if not calls: raise ValueError('The model did not return a tool call. Check tool parser configuration.')
            follow=[*messages,msg]
            for call in calls:
                if call['function']['name']!='celsius_to_fahrenheit': raise ValueError('Unknown tool')
                args=json.loads(call['function']['arguments']); value=args.get('celsius')
                if type(value) not in (int,float) or not -1000<=value<=10000: raise ValueError('Tool requires a reasonable numeric Celsius value.')
                output={'celsius':value,'fahrenheit':round(value*9/5+32,3)}
                emit('tool',name='celsius_to_fahrenheit',arguments=args,result=output)
                follow.append({'role':'tool','tool_call_id':call['id'],'content':json.dumps(output)})
            await request({**body,'messages':follow},'3 · Model explains the result')
        else: await request(body)
    emit('done',seconds=round(time.perf_counter()-start,3))

if __name__=='__main__':
    try: asyncio.run(main(settings()))
    except Exception as e:
        emit('error',text=str(e)); sys.exit(1)
