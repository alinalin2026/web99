import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { timingSafeEqual } from 'node:crypto';

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.WEB99_OPS_PORT || 3011);
const HOST = '127.0.0.1';
const HELPER = process.env.WEB99_OPS_HELPER || '/usr/local/libexec/web99-ops-tool';
const OPENAI_URL = 'https://api.openai.com/v1/responses';

const SYSTEM = `You are the private Web99 server operations agent running on the same AWS EC2 server as Web99.
Your only job is to diagnose and repair Web99 production through the provided restricted tools.

Rules:
- Prefer the smallest fix and the fewest moving parts.
- Diagnose before changing anything unless the operator explicitly asks for a restart, deploy or backup.
- Never request, reveal or inspect secrets, .env files, private keys or credentials.
- Never invent shell commands. You can only use the provided tools.
- Do not claim something is fixed until a check proves it.
- Read-only questions must stay read-only.
- Mutating tools are only allowed when the operator explicitly asks to fix, repair, restart, reload, restore, deploy, recover, apply, enable, disable or back up.
- Keep replies short: what you found, what you did, what is true now.`;

const TOOLS = [
  { type:'function', name:'get_status', description:'Read Web99 service states and local health.', strict:true, parameters:{type:'object',properties:{},required:[],additionalProperties:false}},
  { type:'function', name:'get_logs', description:'Read recent dashboard, worker or nginx logs.', strict:true, parameters:{type:'object',properties:{service:{type:'string',enum:['dashboard','worker','nginx']},lines:{type:'integer',minimum:10,maximum:250}},required:['service','lines'],additionalProperties:false}},
  { type:'function', name:'check_url', description:'Check one https://web99.ie path and follow redirects.', strict:true, parameters:{type:'object',properties:{path:{type:'string',minLength:1,maxLength:300}},required:['path'],additionalProperties:false}},
  { type:'function', name:'test_nginx', description:'Validate active Nginx configuration.', strict:true, parameters:{type:'object',properties:{},required:[],additionalProperties:false}},
  { type:'function', name:'reload_nginx', description:'Validate and reload Nginx.', strict:true, parameters:{type:'object',properties:{},required:[],additionalProperties:false}},
  { type:'function', name:'restart_service', description:'Restart Web99 dashboard, worker, or both.', strict:true, parameters:{type:'object',properties:{target:{type:'string',enum:['dashboard','worker','all']}},required:['target'],additionalProperties:false}},
  { type:'function', name:'backup_database', description:'Create and verify a PostgreSQL backup.', strict:true, parameters:{type:'object',properties:{},required:[],additionalProperties:false}},
  { type:'function', name:'start_deploy', description:'Start the tracked Web99 deploy in an independent systemd job.', strict:true, parameters:{type:'object',properties:{},required:[],additionalProperties:false}},
  { type:'function', name:'get_deploy_status', description:'Read the most recent Ops deployment status and logs.', strict:true, parameters:{type:'object',properties:{},required:[],additionalProperties:false}},
  { type:'function', name:'restore_tracked_config', description:'Restore tracked Web99 Nginx/systemd config and reload Nginx.', strict:true, parameters:{type:'object',properties:{},required:[],additionalProperties:false}},
  { type:'function', name:'show_config', description:'Read safe Nginx/dashboard/worker config without secrets.', strict:true, parameters:{type:'object',properties:{target:{type:'string',enum:['nginx','dashboard-service','worker-service']}},required:['target'],additionalProperties:false}}
];

const MUTATING = new Set(['reload_nginx','restart_service','backup_database','start_deploy','restore_tracked_config']);
const mutationAllowed = m => /\b(fix|repair|restart|deploy|reload|restore|backup|recover|apply|enable|disable)\b|\bback\s+up\b/i.test(m);

function secret(){ return (process.env.ADMIN_PASSWORD || '').trim(); }
function authorised(req){
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return false;
  const a = Buffer.from(h.slice(7).trim());
  const b = Buffer.from(secret());
  return !!b.length && a.length === b.length && timingSafeEqual(a,b);
}
function json(res, code, body){
  const data = JSON.stringify(body);
  res.writeHead(code, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(data);
}
function clip(s,max=12000){ s=String(s||''); return s.length<=max?s:s.slice(0,max)+`\n...[truncated ${s.length-max} chars]`; }

async function helper(action,args=[],timeout=45000){
  try{
    const {stdout,stderr}=await execFileAsync('sudo',['-n',HELPER,action,...args],{timeout,maxBuffer:1024*1024});
    return {ok:true,output:clip([stdout,stderr].filter(Boolean).join('\n').trim()||'OK')};
  }catch(e){
    return {ok:false,output:clip([e?.stdout,e?.stderr,e?.message||String(e)].filter(Boolean).join('\n'))};
  }
}

async function execute(name,args,canMutate){
  if(MUTATING.has(name)&&!canMutate) return {ok:false,output:'Mutation blocked: the operator did not explicitly ask to fix/restart/deploy/reload/restore/back up.'};
  switch(name){
    case 'get_status': return helper('status');
    case 'get_logs': return helper('logs',[String(args.service),String(args.lines)]);
    case 'check_url': return helper('check-url',[String(args.path)]);
    case 'test_nginx': return helper('nginx-test');
    case 'reload_nginx': return helper('nginx-reload');
    case 'restart_service': return helper('restart',[String(args.target)]);
    case 'backup_database': return helper('backup',[],120000);
    case 'start_deploy': return helper('deploy');
    case 'get_deploy_status': return helper('deploy-status');
    case 'restore_tracked_config': return helper('restore-config');
    case 'show_config': return helper('show-config',[String(args.target)]);
    default: return {ok:false,output:`Unknown tool: ${name}`};
  }
}

function outputText(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim()) return data.output_text.trim();
  const out=[];
  for(const item of data?.output||[]) if(item?.type==='message') for(const block of item.content||[]) if(block?.type==='output_text'&&block.text) out.push(block.text);
  return out.join('').trim();
}

async function openai(input){
  const key=(process.env.OPENAI_API_KEY||'').trim();
  if(!key) throw new Error('OPENAI_API_KEY is not configured');
  const r=await fetch(OPENAI_URL,{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_OPS_MODEL||process.env.OPENAI_AGENT_MODEL||'gpt-5.1',instructions:SYSTEM,input,tools:TOOLS,tool_choice:'auto',max_output_tokens:2200,store:false}),signal:AbortSignal.timeout(90000)});
  const raw=await r.text(); let data;
  try{data=raw?JSON.parse(raw):{};}catch{throw new Error(`OpenAI invalid JSON (${r.status})`);}
  if(!r.ok) throw new Error(data?.error?.message||`OpenAI HTTP ${r.status}`);
  return data;
}

async function runAgent(message,history=[]){
  const input=[...history.slice(-10).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.content==='string').map(x=>({role:x.role,content:x.content.slice(0,3500)})),{role:'user',content:message.slice(0,5000)}];
  const actions=[]; const canMutate=mutationAllowed(message);
  for(let round=0;round<7;round++){
    const response=await openai(input);
    const calls=(response.output||[]).filter(x=>x?.type==='function_call');
    if(!calls.length) return {message:outputText(response)||'Done.',actions};
    input.push(...(response.output||[]));
    for(const call of calls){
      let args={}; try{args=call.arguments?JSON.parse(call.arguments):{};}catch{}
      const result=await execute(call.name,args,canMutate);
      actions.push({name:call.name,ok:result.ok,summary:clip(result.output,900)});
      input.push({type:'function_call_output',call_id:call.call_id,output:JSON.stringify(result)});
    }
  }
  throw new Error('Ops Agent exceeded tool-call limit');
}

const PAGE=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>Web99 Ops</title><style>*{box-sizing:border-box}body{margin:0;background:#0d1016;color:#f6f7fb;font-family:system-ui,-apple-system,sans-serif}.wrap{max-width:760px;margin:auto;padding:18px}.top{display:flex;align-items:center;gap:12px;margin-bottom:20px}.logo{width:42px;height:42px;border-radius:13px;background:#6d55ee;display:grid;place-items:center;font-weight:900}.muted{color:#9da6b6;font-size:13px}.card,.msg{background:#171c26;border:1px solid #293142;border-radius:18px;padding:15px;margin:10px 0}.user{background:#6250d8;margin-left:12%}.input{width:100%;padding:14px;border-radius:13px;border:1px solid #343d51;background:#0f131b;color:white;font:inherit}.row{display:flex;gap:8px}.btn{border:0;background:#826dff;color:white;border-radius:13px;padding:12px 15px;font-weight:750}.quick{display:flex;gap:7px;overflow:auto;margin:12px 0}.quick .btn{background:#202736;white-space:nowrap;font-size:12px}.tools{font:11px ui-monospace,monospace;color:#bcc5d6;white-space:pre-wrap;margin-top:9px}.composer{position:sticky;bottom:0;background:linear-gradient(transparent,#0d1016 25%);padding-top:24px;padding-bottom:env(safe-area-inset-bottom)}textarea{min-height:58px;resize:vertical}</style></head><body><div class="wrap"><div class="top"><div class="logo">99</div><div><b>Web99 Ops</b><div class="muted">Independent AWS repair agent</div></div></div><div id="login" class="card"><b>Operator access</b><p class="muted">Same password as Web99 Control.</p><div class="row"><input id="key" class="input" type="password" placeholder="Password"><button id="unlock" class="btn">Unlock</button></div><div id="err" class="muted"></div></div><div id="app" hidden><div class="card"><b>I run separately from the Web99 dashboard.</b><div class="muted">So I can diagnose it even when Control is down.</div><div class="quick"><button class="btn" data-p="Check the whole Web99 system and tell me what is wrong.">Check system</button><button class="btn" data-p="Fix why https://web99.ie/control is not working. Diagnose first, then repair and verify.">Fix Control</button><button class="btn" data-p="Check Sarah, /start, her avatar and the chat API. Fix anything clearly wrong and verify.">Fix Sarah</button></div></div><div id="msgs"></div><div class="composer row"><textarea id="prompt" class="input" placeholder="Tell Ops what to check or fix..."></textarea><button id="send" class="btn">Send</button></div></div></div><script>let token=sessionStorage.getItem('w99ops')||'',hist=[];const q=x=>document.querySelector(x),msgs=q('#msgs');function show(ok){q('#login').hidden=ok;q('#app').hidden=!ok}async function verify(t){let r=await fetch('./health',{headers:{Authorization:'Bearer '+t}});if(!r.ok)throw Error('Wrong password or agent unavailable');}q('#unlock').onclick=async()=>{try{token=q('#key').value.trim();await verify(token);sessionStorage.setItem('w99ops',token);show(true)}catch(e){q('#err').textContent=e.message}};function add(role,text,actions=[]){let d=document.createElement('div');d.className='msg '+(role==='user'?'user':'');d.textContent=text;if(actions.length){let t=document.createElement('div');t.className='tools';t.textContent=actions.map(a=>(a.ok?'✓ ':'× ')+a.name+'\n'+a.summary).join('\n\n');d.appendChild(t)}msgs.appendChild(d);d.scrollIntoView({behavior:'smooth'})}async function ask(text){text=text.trim();if(!text)return;add('user',text);q('#prompt').value='';let w=document.createElement('div');w.className='msg';w.textContent='Checking AWS…';msgs.appendChild(w);try{let r=await fetch('./api',{method:'POST',headers:{'content-type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({message:text,history:hist})});let data=await r.json();w.remove();if(!r.ok)throw Error(data.error||'Agent failed');add('assistant',data.message,data.actions||[]);hist.push({role:'user',content:text},{role:'assistant',content:data.message});hist=hist.slice(-10)}catch(e){w.remove();add('assistant','ERROR: '+e.message)}}q('#send').onclick=()=>ask(q('#prompt').value);q('#prompt').onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();ask(q('#prompt').value)}};document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>ask(b.dataset.p));if(token)verify(token).then(()=>show(true)).catch(()=>{token='';sessionStorage.removeItem('w99ops');show(false)});else show(false);</script></body></html>`;

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&(url.pathname==='/'||url.pathname==='/index.html')){res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-frame-options':'DENY'});return res.end(PAGE);}
    if(url.pathname==='/health'){
      if(!authorised(req)) return json(res,401,{ok:false,error:'Not authorised'});
      return json(res,200,{ok:true,service:'web99-ops-agent'});
    }
    if(url.pathname==='/api'&&req.method==='POST'){
      if(!authorised(req)) return json(res,401,{error:'Not authorised'});
      let raw=''; for await(const chunk of req){raw+=chunk;if(raw.length>80000)throw new Error('Request too large');}
      const body=JSON.parse(raw||'{}');
      if(typeof body.message!=='string'||!body.message.trim()) return json(res,400,{error:'message required'});
      const result=await runAgent(body.message,Array.isArray(body.history)?body.history:[]);
      return json(res,200,result);
    }
    json(res,404,{error:'Not found'});
  }catch(e){json(res,500,{error:e?.message||String(e)});}
});

server.listen(PORT,HOST,()=>console.log(`Web99 Ops Agent listening on http://${HOST}:${PORT}`));
