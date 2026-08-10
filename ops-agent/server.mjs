import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHmac, timingSafeEqual } from 'node:crypto';

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.WEB99_OPS_PORT || 3011);
const HOST = '127.0.0.1';
const HELPER = process.env.WEB99_OPS_HELPER || '/usr/local/libexec/web99-ops-tool';
const OPENAI_URL = 'https://api.openai.com/v1/responses';
const COOKIE = 'w99ops';

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
function safeEqual(a,b){
  const aa=Buffer.from(String(a));
  const bb=Buffer.from(String(b));
  return aa.length===bb.length && aa.length>0 && timingSafeEqual(aa,bb);
}
function sessionToken(){ return createHmac('sha256',secret()).update('web99-ops-session-v1').digest('hex'); }
function cookieValue(req,name){
  const raw=req.headers.cookie || '';
  for(const part of raw.split(';')){
    const i=part.indexOf('=');
    if(i<0) continue;
    if(part.slice(0,i).trim()===name) return decodeURIComponent(part.slice(i+1).trim());
  }
  return '';
}
function authorised(req){
  const configured=secret();
  if(!configured) return false;
  const h=req.headers.authorization || '';
  if(h.startsWith('Bearer ') && safeEqual(h.slice(7).trim(),configured)) return true;
  return safeEqual(cookieValue(req,COOKIE),sessionToken());
}
function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g,ch=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}
function html(res,code,body,extra={}){
  res.writeHead(code,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-frame-options':'DENY',...extra});
  res.end(body);
}
function json(res, code, body){
  const data=JSON.stringify(body);
  res.writeHead(code,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(data);
}
function clip(s,max=12000){ s=String(s||''); return s.length<=max?s:s.slice(0,max)+`\n...[truncated ${s.length-max} chars]`; }
async function readBody(req,max=80000){
  let raw='';
  for await(const chunk of req){ raw+=chunk; if(raw.length>max) throw new Error('Request too large'); }
  return raw;
}
function formData(raw){
  const p=new URLSearchParams(raw);
  return Object.fromEntries(p.entries());
}

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

async function runAgent(message){
  const input=[{role:'user',content:message.slice(0,5000)}];
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

const CSS=`*{box-sizing:border-box}body{margin:0;background:#0d1016;color:#f6f7fb;font-family:system-ui,-apple-system,sans-serif}.wrap{max-width:760px;margin:auto;padding:18px}.top{display:flex;align-items:center;gap:12px;margin-bottom:20px}.logo{width:46px;height:46px;border-radius:14px;background:#6d55ee;display:grid;place-items:center;font-weight:900;font-size:20px}.muted{color:#9da6b6;font-size:14px}.card{background:#171c26;border:1px solid #293142;border-radius:18px;padding:17px;margin:12px 0}.input{width:100%;padding:14px;border-radius:13px;border:1px solid #343d51;background:#0f131b;color:white;font:inherit}.row{display:flex;gap:9px}.btn{border:0;background:#826dff;color:white;border-radius:13px;padding:13px 16px;font-weight:750;font-size:15px}.secondary{background:#242c3b}.quick{display:flex;gap:8px;overflow:auto;margin:14px 0}.quick form{min-width:max-content}.result{white-space:pre-wrap;line-height:1.45}.tools{font:12px ui-monospace,monospace;color:#bcc5d6;white-space:pre-wrap;border-top:1px solid #30394b;margin-top:14px;padding-top:12px}textarea{min-height:110px;resize:vertical}.error{color:#ff9c9c}.ok{color:#9ee8b2}.logout{margin-left:auto}form{margin:0}@media(max-width:560px){.row{align-items:stretch}.loginrow{flex-direction:column}.btn{min-height:48px}}`;
function shell(content){
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>Web99 Ops</title><style>${CSS}</style></head><body><div class="wrap"><div class="top"><div class="logo">99</div><div><b style="font-size:22px">Web99 Ops</b><div class="muted">Independent AWS repair agent</div></div></div>${content}</div></body></html>`;
}
function loginPage(error=''){
  return shell(`<div class="card"><b style="font-size:21px">Operator access</b><p class="muted">Same password as Web99 Control.</p>${error?`<p class="error">${escapeHtml(error)}</p>`:''}<form method="post" action="/ops-console/login"><div class="row loginrow"><input class="input" type="password" name="password" autocomplete="current-password" placeholder="Password" required autofocus><button class="btn" type="submit">Unlock</button></div></form></div>`);
}
function consolePage(result=null,error=''){
  const actionHtml=result?.actions?.length?`<div class="tools">${result.actions.map(a=>`${a.ok?'✓':'×'} ${escapeHtml(a.name)}\n${escapeHtml(a.summary)}`).join('\n\n')}</div>`:'';
  const resultHtml=result?`<div class="card"><b>Ops result</b><div class="result">${escapeHtml(result.message)}</div>${actionHtml}</div>`:'';
  return shell(`<div class="card"><div class="row"><div><b>Repair console</b><div class="muted">This runs separately from Control and the website builder.</div></div><form class="logout" method="post" action="/ops-console/logout"><button class="btn secondary" type="submit">Lock</button></form></div>${error?`<p class="error">${escapeHtml(error)}</p>`:''}<div class="quick"><form method="post" action="/ops-console/ask"><input type="hidden" name="message" value="Check the whole Web99 system and tell me what is wrong."><button class="btn secondary" type="submit">Check system</button></form><form method="post" action="/ops-console/ask"><input type="hidden" name="message" value="Fix why https://web99.ie/control is not working. Diagnose first, then repair and verify."><button class="btn secondary" type="submit">Fix Control</button></form><form method="post" action="/ops-console/ask"><input type="hidden" name="message" value="Check Sarah, /start, her avatar and the chat API. Fix anything clearly wrong and verify."><button class="btn secondary" type="submit">Fix Sarah</button></form></div><form method="post" action="/ops-console/ask"><textarea class="input" name="message" placeholder="Tell Ops what to check or fix..." required></textarea><div style="margin-top:9px"><button class="btn" type="submit">Run on AWS</button></div></form></div>${resultHtml}`);
}

const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET' && (url.pathname==='/'||url.pathname==='/index.html')){
      return html(res,200,authorised(req)?consolePage():loginPage());
    }
    if(req.method==='POST' && url.pathname==='/login'){
      const body=formData(await readBody(req,10000));
      if(!safeEqual(String(body.password||'').trim(),secret())) return html(res,401,loginPage('Wrong password.'));
      return html(res,303,'',{'set-cookie':`${COOKIE}=${encodeURIComponent(sessionToken())}; Path=/ops-console/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`,'location':'/ops-console/'});
    }
    if(req.method==='POST' && url.pathname==='/logout'){
      return html(res,303,'',{'set-cookie':`${COOKIE}=; Path=/ops-console/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,'location':'/ops-console/'});
    }
    if(url.pathname==='/health'){
      if(!authorised(req)) return json(res,401,{ok:false,error:'Not authorised'});
      return json(res,200,{ok:true,service:'web99-ops-agent'});
    }
    if(req.method==='POST' && url.pathname==='/ask'){
      if(!authorised(req)) return html(res,401,loginPage('Session expired. Unlock again.'));
      const body=formData(await readBody(req));
      const message=String(body.message||'').trim();
      if(!message) return html(res,400,consolePage(null,'Message required.'));
      try{
        const result=await runAgent(message);
        return html(res,200,consolePage(result));
      }catch(e){
        return html(res,500,consolePage(null,e?.message||String(e)));
      }
    }
    if(url.pathname==='/api'&&req.method==='POST'){
      if(!authorised(req)) return json(res,401,{error:'Not authorised'});
      const body=JSON.parse(await readBody(req)||'{}');
      if(typeof body.message!=='string'||!body.message.trim()) return json(res,400,{error:'message required'});
      return json(res,200,await runAgent(body.message));
    }
    json(res,404,{error:'Not found'});
  }catch(e){
    if(!res.headersSent) json(res,500,{error:e?.message||String(e)});
    else res.end();
  }
});

server.listen(PORT,HOST,()=>console.log(`Web99 Ops Agent listening on http://${HOST}:${PORT}`));
