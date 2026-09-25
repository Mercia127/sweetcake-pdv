let produtos = JSON.parse(localStorage.getItem('produtos')) || [];

let venda = [];

let historico = JSON.parse(localStorage.getItem('hist')) || [];
let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
let fiado = JSON.parse(localStorage.getItem('fiado')) || {};
let historicoFiado = JSON.parse(localStorage.getItem('historicoFiado')) || [];
let clienteFiadoPendente = '';

let forma = '';

let pagamentos = [];

let ultimaVendaSalva = null;

let caixaResumo = JSON.parse(localStorage.getItem('caixaResumo')) || {
 dinheiro:0,
 pix:0,
 cartao:0,
 fiado:0,
 delivery:0
};

let aberturaCaixa = JSON.parse(localStorage.getItem('aberturaCaixa')) || 0;

let deliveryAtivo = false;

let dadosDelivery = {};

let sangrias = JSON.parse(localStorage.getItem('sangrias')) || [];

let sangriasCaixa = JSON.parse(localStorage.getItem('sangriasCaixa')) || {
 dinheiro:0,
 pix:0
};
let suprimentos = JSON.parse(localStorage.getItem('suprimentos')) || [];

let caixaAberto = JSON.parse(localStorage.getItem('caixaAberto')) || false;
let contadorVendasCaixa = Number(localStorage.getItem('contadorVendasCaixa') || 0);

// GESTÃO / METAS
const META_BASE = 4000;
let metasMensais = JSON.parse(localStorage.getItem('metasMensais')) || {};
let fechamentosMensais = JSON.parse(localStorage.getItem('fechamentosMensais')) || [];
let periodoAtivo = localStorage.getItem('periodoAtivo') || new Date().toISOString().slice(0,7);

function chaveMes(data = new Date()){
 let d = new Date(data);
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function formatarMes(chave){
 let [ano,mes] = chave.split('-');
 return `${mes}/${ano}`;
}

function getMetaMes(){
 return Number(metasMensais[periodoAtivo] || META_BASE);
}

function salvarMetas(){
 localStorage.setItem('metasMensais', JSON.stringify(metasMensais));
 localStorage.setItem('fechamentosMensais', JSON.stringify(fechamentosMensais));
 localStorage.setItem('periodoAtivo', periodoAtivo);
}

function vendasDoPeriodo(){
 return historico.filter(v => chaveMes(v.data) === periodoAtivo);
}

function diasAbertosNoMes(chave){
 let [ano,mes] = chave.split('-').map(Number);
 let ultimo = new Date(ano, mes, 0).getDate();
 let total = 0;
 for(let dia=1; dia<=ultimo; dia++){
  let d = new Date(ano, mes-1, dia);
  let semana = d.getDay();
  // Funcionamento padrão: terça a domingo.
  // Segunda-feira é folga padrão e não entra na meta normal.
  if(semana !== 1) total++;
 }
 return total || 1;
}

function vendasPorProdutoPeriodo(vendas){
 let mapa = {};
 vendas.forEach(v=>{
  (v.itens || []).forEach(item=>{
   let chave = item.codigo || item.nome;
   if(!mapa[chave]) mapa[chave] = {nome:item.nome, codigo:item.codigo || '', qtd:0, total:0};
   mapa[chave].qtd += Number(item.qtd || 0);
   mapa[chave].total += Number(item.qtd || 0) * Number(item.preco || 0);
  });
 });
 return Object.values(mapa).sort((a,b)=>b.qtd-a.qtd);
}

function resumoPeriodo(chave = periodoAtivo){
 let vendas = historico.filter(v=>chaveMes(v.data) === chave);
 let resumo = {dinheiro:0,pix:0,cartao:0,fiado:0,delivery:0,total:0,vendas:vendas.length,itens:0};
 vendas.forEach(v=>{
  let valor=Number(v.total||0);
  resumo.total += valor;
  if(v.forma === 'Dinheiro') resumo.dinheiro += valor;
  else if(v.forma === 'Pix') resumo.pix += valor;
  else if(v.forma === 'Cartão') resumo.cartao += valor;
  else if(v.forma === 'Fiado') resumo.fiado += valor;
  if(v.delivery) resumo.delivery += valor;
  resumo.itens += (v.itens||[]).reduce((s,i)=>s+Number(i.qtd||0),0);
 });
 let sang = sangrias.filter(s=>chaveMes(s.data) === chave);
 resumo.sangriasDinheiro = sang.filter(s=>(s.forma||'Dinheiro')==='Dinheiro').reduce((s,x)=>s+Number(x.valor||0),0);
 resumo.sangriasPix = sang.filter(s=>xforma(s)==='Pix').reduce((s,x)=>s+Number(x.valor||0),0);
 resumo.sangriasTotal = sang.reduce((s,x)=>s+Number(x.valor||0),0);
 resumo.produtos = vendasPorProdutoPeriodo(vendas);
 return resumo;
}

function xforma(s){ return s && s.forma ? s.forma : 'Dinheiro'; }

const SENHA_GESTAO_PADRAO = 'SweetCake@4000';

function getSenhaGestao(){
 let senha = localStorage.getItem('senhaGestao');
 if(!senha){
  senha = SENHA_GESTAO_PADRAO;
  localStorage.setItem('senhaGestao', senha);
 }
 return senha;
}

function pedirSenhaGestao(){
 let modal = document.getElementById('modalSenhaGestao');

 if(!modal){
  modal = document.createElement('div');
  modal.id = 'modalSenhaGestao';
  modal.style.cssText =
   'position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:100000;padding:20px;box-sizing:border-box;';

  modal.innerHTML = `
   <div style="background:#fff;border-radius:16px;padding:24px;width:100%;max-width:360px;box-sizing:border-box;text-align:center;box-shadow:0 10px 35px rgba(0,0,0,.25)">
    <div style="font-size:28px;margin-bottom:8px">🔐</div>
    <h3 style="margin:0 0 8px">Área exclusiva da administração</h3>
    <p style="margin:0 0 15px;color:#666;font-size:13px">Digite sua senha para continuar.</p>

    <input id="senhaGestaoInput"
     type="password"
     autocomplete="current-password"
     placeholder="Digite sua senha"
     style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #ddd;border-radius:9px;font-size:16px;">

    <div style="display:flex;gap:8px;margin-top:14px">
     <button id="cancelarSenhaGestao" style="flex:1;padding:11px;border:0;border-radius:9px;cursor:pointer">Cancelar</button>
     <button id="confirmarSenhaGestao" style="flex:1;padding:11px;border:0;border-radius:9px;cursor:pointer">Entrar</button>
    </div>
   </div>
  `;

  document.body.appendChild(modal);
 }

 modal.style.display='flex';

 let input=document.getElementById('senhaGestaoInput');
 let confirmar=document.getElementById('confirmarSenhaGestao');
 let cancelar=document.getElementById('cancelarSenhaGestao');

 input.value='';
 setTimeout(()=>input.focus(),50);

 return new Promise(resolve=>{
  let finalizado=false;

  function terminar(resultado){
   if(finalizado) return;
   finalizado=true;

   confirmar.onclick=null;
   cancelar.onclick=null;
   input.onkeydown=null;
   modal.style.display='none';

   resolve(resultado);
  }

  confirmar.onclick=()=>{
   let senha=input.value;

   if(senha === getSenhaGestao()){
    terminar(true);
   }else{
    alert('Senha incorreta!');
    input.value='';
    input.focus();
   }
  };

  cancelar.onclick=()=>terminar(false);

  input.onkeydown=(e)=>{
   if(e.key==='Enter'){
    e.preventDefault();
    confirmar.click();
   }

   if(e.key==='Escape'){
    e.preventDefault();
    cancelar.click();
   }
  };
 });
}

function alterarSenhaGestao(){
 let atual = prompt('🔐 Para trocar a senha, digite a senha atual:');
 if(atual === null) return;
 if(atual !== getSenhaGestao()){ alert('Senha atual incorreta!'); return; }

 let nova = prompt('Digite a nova senha (mínimo 6 caracteres):\n\n💡 Dica: escolha algo fácil para você lembrar, mas difícil para outras pessoas adivinharem.');
 if(nova === null) return;
 nova = nova.trim();
 if(nova.length < 6){ alert('A nova senha precisa ter pelo menos 6 caracteres.'); return; }

 let confirmar = prompt('Digite a nova senha novamente para confirmar:');
 if(confirmar === null) return;
 if(nova !== confirmar){ alert('As senhas não conferem.'); return; }

 localStorage.setItem('senhaGestao', nova);
 alert('✅ Senha da área de Gestão alterada com sucesso!');
}

async function abrirGestao(){
 if(!(await pedirSenhaGestao())) return;
 document.getElementById('mGestao').style.display='flex';
 atualizarGestao();
}

function atualizarGestao(){
 let r = resumoPeriodo();
 let meta = getMetaMes();
 let dias = diasAbertosNoMes(periodoAtivo);
 let restante = Math.max(meta-r.total,0);
 let perc = meta > 0 ? Math.min((r.total/meta)*100,100) : 0;
 let hoje = new Date();
 let chaveHoje = chaveMes(hoje);
 let diasRestantes = 0;
 if(chaveHoje === periodoAtivo){
  let ultimo = new Date(hoje.getFullYear(),hoje.getMonth()+1,0).getDate();
  for(let d=hoje.getDate(); d<=ultimo; d++){
   let w=new Date(hoje.getFullYear(),hoje.getMonth(),d).getDay();
   if(w!==1) diasRestantes++; // terça a domingo; segunda normalmente fechada
  }
 }else if(periodoAtivo > chaveHoje){
  // Se o próximo mês já estiver ativo, considera todos os dias de funcionamento dele.
  diasRestantes = dias;
 }
 let metaDiaria = meta/dias;
 let metaRestanteDia = diasRestantes>0 ? restante/diasRestantes : 0;
 let produtos = r.produtos;
 let top = produtos.slice(0,5).map((p,i)=>`${i+1}. ${p.nome} — ${p.qtd} un. — R$ ${p.total.toFixed(2)}`).join('<br>') || 'Nenhuma venda no período.';
 let porDia = {};
 vendasDoPeriodo().forEach(v=>{
  let d = new Date(v.data).toLocaleDateString('pt-BR');
  if(!porDia[d]) porDia[d] = {qtd:0,total:0};
  porDia[d].qtd++;
  porDia[d].total += Number(v.total||0);
 });
 let diasHtml = Object.entries(porDia).reverse().map(([d,x])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee"><span>${d} — ${x.qtd} venda(s)</span><b>R$ ${x.total.toFixed(2)}</b></div>`).join('') || 'Nenhuma venda no período.';
 let html = `
  <div class="gestaoResumo">
   <div class="gestaoCard"><small>Meta-base</small><b>R$ ${META_BASE.toFixed(2)}</b></div>
   <div class="gestaoCard"><small>Meta do mês</small><b>R$ ${meta.toFixed(2)}</b></div>
   <div class="gestaoCard"><small>Vendido</small><b>R$ ${r.total.toFixed(2)}</b></div>
   <div class="gestaoCard"><small>Falta</small><b>R$ ${restante.toFixed(2)}</b></div>
  </div>
  <div style="margin:12px 0"><b>🎯 ${perc.toFixed(1)}%</b><div class="barraMeta"><span style="width:${perc}%"></span></div></div>
  <p><b>Meta média por dia aberto:</b> R$ ${metaDiaria.toFixed(2)}</p>
  <p><b>Meta por dia restante:</b> R$ ${metaRestanteDia.toFixed(2)}</p>
  <hr>
  <b>💵 Dinheiro:</b> R$ ${r.dinheiro.toFixed(2)} &nbsp; <b>💠 Pix:</b> R$ ${r.pix.toFixed(2)}<br>
  <b>💳 Cartão:</b> R$ ${r.cartao.toFixed(2)} &nbsp; <b>📒 Fiado:</b> R$ ${r.fiado.toFixed(2)}<br>
  <b>🚚 Delivery:</b> R$ ${r.delivery.toFixed(2)}<br>
  <b>💸 Sangrias:</b> R$ ${r.sangriasTotal.toFixed(2)} (Dinheiro R$ ${r.sangriasDinheiro.toFixed(2)} / Pix R$ ${r.sangriasPix.toFixed(2)})<br>
  <b>💰 Saldo atual após sangrias:</b> Dinheiro R$ ${Number(caixaResumo.dinheiro||0).toFixed(2)} / Pix R$ ${Number(caixaResumo.pix||0).toFixed(2)}
  <hr>
  <b>🏆 Mais vendidos</b><br>${top}
  <hr>
  <b>📅 Vendas por dia</b><br>${diasHtml}
  <hr>
  <p><b>Período:</b> ${formatarMes(periodoAtivo)} | <b>Vendas:</b> ${r.vendas} | <b>Itens:</b> ${r.itens}</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
   <button onclick="alterarMetaMes()">✏ Alterar meta do mês</button>
   <button onclick="alterarSenhaGestao()">🔐 Alterar senha</button>
   <button onclick="fecharMes()">📅 Fechar mês e imprimir</button>
   <button onclick="imprimirResumoMes()">🖨 Imprimir resumo</button>
   <button onclick="verHistoricoFechamentos()">📚 Meses fechados</button>
  </div>`;
 document.getElementById('gestaoConteudo').innerHTML=html;
}

function alterarMetaMes(){
 let atual=getMetaMes();
 let valor=prompt(`Meta-base: R$ ${META_BASE.toFixed(2)}\nMeta atual de ${formatarMes(periodoAtivo)}:`, atual.toFixed(2));
 if(valor===null) return;
 valor=parseFloat(String(valor).replace(',','.'));
 if(!Number.isFinite(valor) || valor<=0){ alert('Meta inválida.'); return; }
 metasMensais[periodoAtivo]=valor;
 salvarMetas();
 atualizarGestao();
}

function montarResumoTexto(chave=periodoAtivo){
 let r=resumoPeriodo(chave);
 let meta=Number(metasMensais[chave]||META_BASE);
 let texto=`FECHAMENTO SWEETCAKE\nMês: ${formatarMes(chave)}\n\nMETA-BASE: R$ ${META_BASE.toFixed(2)}\nMETA DO MÊS: R$ ${meta.toFixed(2)}\nTOTAL VENDIDO: R$ ${r.total.toFixed(2)}\nVENDAS: ${r.vendas}\nITENS: ${r.itens}\n\nFORMAS DE PAGAMENTO\nDinheiro: R$ ${r.dinheiro.toFixed(2)}\nPix: R$ ${r.pix.toFixed(2)}\nCartão: R$ ${r.cartao.toFixed(2)}\nFiado: R$ ${r.fiado.toFixed(2)}\nDelivery: R$ ${r.delivery.toFixed(2)}\n\nSANGRIAS\nDinheiro: R$ ${r.sangriasDinheiro.toFixed(2)}\nPix: R$ ${r.sangriasPix.toFixed(2)}\nTotal: R$ ${r.sangriasTotal.toFixed(2)}\n\nPRODUTOS VENDIDOS\n`;
 r.produtos.forEach((p,i)=> texto += `${i+1}. ${p.nome} | Cód: ${p.codigo} | Qtd: ${p.qtd} | R$ ${p.total.toFixed(2)}\n`);
 return texto;
}

function imprimirResumoMes(chave=periodoAtivo){
 let texto=montarResumoTexto(chave);
 let tela=window.open('','','width=360,height=700');
 if(!tela){ alert('O navegador bloqueou a impressão. Permita pop-ups para o PDV.'); return false; }
 tela.document.write(`<html><head><title>Fechamento ${formatarMes(chave)}</title><style>body{font-family:monospace;width:300px;padding:10px;white-space:pre-wrap;font-size:12px}h2{text-align:center}</style></head><body><h2>SWEETCAKE</h2>${texto.replace(/</g,'&lt;')}</body></html>`);
 tela.document.close();
 setTimeout(()=>{tela.print();},300);
 return true;
}


function abrirHistoricoFechamentos(){
 let html = `<h2>📚 Histórico de Fechamentos</h2>`;
 if(!fechamentosMensais.length){
  html += `<p>Nenhum mês fechado ainda.</p>`;
 }else{
  html += `<table class="tabela"><thead><tr><th>Mês</th><th>Vendido</th><th>Meta</th><th>%</th><th>Vendas</th><th>Ação</th></tr></thead><tbody>`;
  fechamentosMensais.slice().reverse().forEach((f,i)=>{
   let total = Number(f.resumo?.total||0);
   let meta = Number(f.metaMes||META_BASE);
   let pct = meta ? Math.round(total/meta*100) : 0;
   html += `<tr><td>${formatarMes(f.mes)}</td><td>R$ ${total.toFixed(2)}</td><td>R$ ${meta.toFixed(2)}</td><td>${pct}%</td><td>${Number(f.resumo?.vendas||0)}</td><td><button onclick="imprimirFechamentoHistorico(${fechamentosMensais.length-1-i})">🖨️ Imprimir</button></td></tr>`;
  });
  html += `</tbody></table>`;
 }
 abrirModal(html);
}

function imprimirFechamentoHistorico(indice){
 let f = fechamentosMensais[indice];
 if(!f) return;
 imprimirResumoFechamento(f);
}

function imprimirResumoFechamento(f){
 let r=f.resumo||{};
 let meta=Number(f.metaMes||META_BASE);
 let total=Number(r.total||0);
 let pct=meta?Math.round(total/meta*100):0;
 let produtos=(r.produtos||[]).map((p,i)=>`${i+1}. ${p.nome} — ${p.qtd} un. — R$ ${Number(p.total||0).toFixed(2)}`).join('\n')||'Nenhum produto vendido.';
 let porDia=r.porDia||{};
 let dias=Object.entries(porDia).map(([d,x])=>`${d} — ${x.qtd} venda(s) — R$ ${Number(x.total||0).toFixed(2)}`).join('\n')||'Nenhuma venda.';
 let texto = `
SWEETCAKE — FECHAMENTO MENSAL
Mês: ${formatarMes(f.mes)}
Fechado em: ${new Date(f.fechadoEm).toLocaleString('pt-BR')}

FATURAMENTO
Total vendido: R$ ${total.toFixed(2)}
Meta-base: R$ ${Number(META_BASE).toFixed(2)}
Meta do mês: R$ ${meta.toFixed(2)}
Meta atingida: ${pct}%
${total>=meta ? `Superou a meta em R$ ${(total-meta).toFixed(2)}` : `Faltou R$ ${(meta-total).toFixed(2)}`}

FORMAS DE PAGAMENTO
Dinheiro: R$ ${Number(r.pagamentos?.dinheiro||0).toFixed(2)}
Pix: R$ ${Number(r.pagamentos?.pix||0).toFixed(2)}
Cartão: R$ ${Number(r.pagamentos?.cartao||0).toFixed(2)}
Fiado: R$ ${Number(r.pagamentos?.fiado||0).toFixed(2)}
Delivery: R$ ${Number(r.pagamentos?.delivery||0).toFixed(2)}

SANGRIAS
Dinheiro: R$ ${Number(r.sangriasDinheiro||0).toFixed(2)}
Pix: R$ ${Number(r.sangriasPix||0).toFixed(2)}
Total: R$ ${Number(r.sangriasTotal||0).toFixed(2)}

VENDAS POR DIA
${dias}

PRODUTOS VENDIDOS
${produtos}
`;
 let w=window.open('','_blank','width=800,height=900');
 if(!w){ alert('Permita pop-ups para imprimir o fechamento.'); return false; }
 w.document.write(`<pre style="font:14px Arial;white-space:pre-wrap;padding:25px">${texto.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre><script>window.print()<\/script>`);
 w.document.close();
}
async function fecharMes(){

 // Proteção contra fechamento acidental: usa a mesma senha da Gestão/Metas.
 if(!(await pedirSenhaGestao())) return;

 let chave = periodoAtivo;

 if(fechamentosMensais.some(f=>f.mes===chave)){
  alert('Este mês já foi fechado.');
  return;
 }

 let agora = new Date();

 if(chaveMes(agora)!==chave){
  alert('O período ativo não é o mês atual.');
  return;
 }

 let ultimo = new Date(agora.getFullYear(),agora.getMonth()+1,0).getDate();

 if(agora.getDate()!==ultimo){
  if(!confirm(`Hoje ainda não é o último dia do mês.\nDeseja mesmo fechar ${formatarMes(chave)} agora?`)) return;
 }

 let vendas = vendasDoPeriodo();
 let r = resumoPeriodo(chave);
 let meta = Number(metasMensais[chave] || META_BASE);

 // Resumo por forma de pagamento.
 let pagamentos = {
  Dinheiro:0,
  Pix:0,
  Cartão:0,
  Fiado:0,
  Delivery:0
 };

 vendas.forEach(v=>{
  let forma = v.forma || 'Não informado';
  if(Object.prototype.hasOwnProperty.call(pagamentos,forma)){
   pagamentos[forma] += Number(v.total||0);
  }

  if(v.delivery && forma !== 'Delivery'){
   // Delivery é uma característica da venda, não soma novamente ao faturamento.
  }
 });

 // Ranking dos produtos do mês.
 let mapaProdutos = {};

 vendas.forEach(v=>{
  (v.itens || []).forEach(item=>{
   if(item.codigo === 'ENT' || item.codigo === 'AV') return;

   let chaveProduto = item.codigo || item.nome;

   if(!mapaProdutos[chaveProduto]){
    mapaProdutos[chaveProduto] = {
     nome:item.nome || 'Produto',
     codigo:item.codigo || '-',
     quantidade:0,
     faturamento:0
    };
   }

   let qtd = Number(item.qtd||0);
   let preco = Number(item.preco||0);

   mapaProdutos[chaveProduto].quantidade += qtd;
   mapaProdutos[chaveProduto].faturamento += qtd * preco;
  });
 });

 let rankingProdutos = Object.values(mapaProdutos)
  .sort((a,b)=>{
   if(b.quantidade !== a.quantidade) return b.quantidade-a.quantidade;
   return b.faturamento-a.faturamento;
  });

 // Vendas por dia.
 let porDia = {};

 vendas.forEach(v=>{
  let d = new Date(v.data).toLocaleDateString('pt-BR');

  if(!porDia[d]){
   porDia[d] = {qtd:0,total:0};
  }

  porDia[d].qtd++;
  porDia[d].total += Number(v.total||0);
 });

 let diasComVenda = Object.keys(porDia).length;
 let mediaDia = diasComVenda ? r.total / diasComVenda : 0;
 let percentualMeta = meta > 0 ? (r.total/meta)*100 : 0;

 // Sangrias do mês.
 let sangriasMes = sangrias.filter(s=>chaveMes(s.data)===chave);
 let sangDinheiro = sangriasMes
  .filter(s=>(s.forma||'Dinheiro')==='Dinheiro')
  .reduce((s,x)=>s+Number(x.valor||0),0);

 let sangPix = sangriasMes
  .filter(s=>(s.forma||'Dinheiro')==='Pix')
  .reduce((s,x)=>s+Number(x.valor||0),0);

 let totalSangrias = sangDinheiro + sangPix;

 let resumoCompleto = {
  ...r,
  pagamentos,
  porDia,
  rankingProdutos,
  diasComVenda,
  mediaDia,
  percentualMeta,
  sangDinheiro,
  sangPix,
  totalSangrias
 };

 let registro = {
  mes:chave,
  metaBase:META_BASE,
  metaMes:meta,
  fechadoEm:new Date().toISOString(),
  resumo:resumoCompleto
 };

 fechamentosMensais.push(registro);

 // Inicia o próximo período sem apagar o histórico do mês encerrado.
 let [ano,mes] = chave.split('-').map(Number);
 let proximo = new Date(ano,mes,1);

 periodoAtivo = chaveMes(proximo);

 if(!metasMensais[periodoAtivo]){
  metasMensais[periodoAtivo] = META_BASE;
 }

 // O caixa mensal não deve carregar valores para o próximo período.
 caixaResumo = {dinheiro:0,pix:0,cartao:0,fiado:0,delivery:0};
 aberturaCaixa = 0;

 localStorage.setItem('caixaResumo',JSON.stringify(caixaResumo));
 localStorage.setItem('aberturaCaixa','0');

 salvarMetas();

 const imprimiu = imprimirResumoMes(chave);

 // Mostra um resumo também na tela, mesmo se a impressão for bloqueada.
 let top = rankingProdutos.slice(0,10).map((p,i)=>
  `${i+1}. ${p.nome} — ${p.quantidade} un. — R$ ${p.faturamento.toFixed(2)}`
 ).join('\n');

 let mensagem =
  `📊 MÊS ${formatarMes(chave)} FECHADO!\n\n` +
  `💰 Faturamento: R$ ${Number(r.total||0).toFixed(2)}\n` +
  `🎯 Meta: R$ ${meta.toFixed(2)}\n` +
  `📈 Meta atingida: ${percentualMeta.toFixed(1)}%\n\n` +

  `🧾 Vendas: ${vendas.length}\n` +
  `📦 Itens vendidos: ${Number(r.itens||0)}\n\n` +

  `💵 Dinheiro: R$ ${pagamentos.Dinheiro.toFixed(2)}\n` +
  `💠 Pix: R$ ${pagamentos.Pix.toFixed(2)}\n` +
  `💳 Cartão: R$ ${pagamentos.Cartão.toFixed(2)}\n` +
  `📒 Fiado: R$ ${pagamentos.Fiado.toFixed(2)}\n` +
  `🚚 Delivery: R$ ${pagamentos.Delivery.toFixed(2)}\n\n` +

  `💸 Sangrias: R$ ${totalSangrias.toFixed(2)}\n\n` +
  `🏆 TOP PRODUTOS\n${top || 'Nenhum produto registrado.'}\n\n` +

  `📅 Dias com venda: ${diasComVenda}\n` +
  `📊 Média por dia com venda: R$ ${mediaDia.toFixed(2)}\n\n` +

  `➡️ Próximo período: ${formatarMes(periodoAtivo)}\n` +
  `🎯 Nova meta: R$ ${META_BASE.toFixed(2)}\n\n` +

  (imprimiu
   ? `🖨️ Resumo enviado para impressão.`
   : `⚠️ O navegador bloqueou a impressão, mas o mês foi fechado e arquivado.`);

 alert(mensagem);

 atualizar();
 atualizarGestao();
}

function verHistoricoFechamentos(){
 abrirHistoricoFechamentos();
}

function abrirModal(html){
 let modal = document.getElementById('modalHistoricoFechamentos');
 if(!modal){
  modal = document.createElement('div');
  modal.id = 'modalHistoricoFechamentos';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);display:none;align-items:center;justify-content:center;z-index:99999;padding:20px;box-sizing:border-box;';
  modal.innerHTML = '<div id="conteudoHistoricoFechamentos" style="background:#fff;border-radius:16px;max-width:900px;width:100%;max-height:85vh;overflow:auto;padding:20px;box-sizing:border-box;"></div>';
  document.body.appendChild(modal);
 }
 document.getElementById('conteudoHistoricoFechamentos').innerHTML = html + '<div style="text-align:right;margin-top:15px"><button onclick="document.getElementById(\'modalHistoricoFechamentos\').style.display=\'none\'">Fechar</button></div>';
 modal.style.display='flex';
}

function salvar(){

 localStorage.setItem('produtos', JSON.stringify(produtos));

 localStorage.setItem('hist', JSON.stringify(historico));

 localStorage.setItem('fiado', JSON.stringify(fiado));
 localStorage.setItem('historicoFiado', JSON.stringify(historicoFiado));
}function fechar(id){

 document.getElementById(id).style.display='none';
}function beep(){

 let ctx = new (window.AudioContext || window.webkitAudioContext)();

 let osc = ctx.createOscillator();

 osc.frequency.value = 800;

 osc.connect(ctx.destination);

 osc.start();

 setTimeout(()=>osc.stop(),100);
}setInterval(()=>{

 hora.innerText = new Date().toLocaleTimeString();

},1000);carregarGrid();

atualizar();
function abrirAvulso(){

 document.getElementById('mAvulso').style.display = 'flex';

 document.getElementById('valorAvulso').focus();
}function confirmarAvulso(){

 let val = parseFloat(document.getElementById('valorAvulso').value);

 if(isNaN(val) || val <= 0){
  alert('Valor inválido');
  return;
 }

 venda.push({
  nome:'Venda Avulsa',
  codigo:'AV',
  preco:val,
  qtd:1
 });

 document.getElementById('valorAvulso').value = '';

 fechar('mAvulso');

 beep();

 atualizar();

}
busca.addEventListener('keydown', e => {
if(document.activeElement.id!=='busca')return;

 if(e.key === 'Enter'){

  let val = busca.value.replace(',', '.').trim();
if(/^\d{8,14}$/.test(val)){
    adicionar(val,1);
    atualizar();
    busca.value='';
    return;
  }

  if(val.includes('*')){

   let [q,c] = val.split('*');

   adicionar(c, parseInt(q));

  } 

  else if(!isNaN(val) && val.length < 8){

   venda.push({
    nome:'Avulso',
    codigo:'AV',
    preco:parseFloat(val),
    qtd:1
   });

   beep();

  } 
  else {

   adicionar(val,1);
  }

  atualizar();

  busca.value='';
 }
});
function adicionar(cod,qtd){

 qtd = Number(qtd);

 if(!Number.isInteger(qtd) || qtd <= 0){
  return alert('Quantidade inválida');
 }

 let p = produtos.find(x =>
  String(x.codigo) == String(cod) ||
  String(x.nome).toLowerCase() == String(cod).toLowerCase()
 );

 if(!p) return alert('Produto não encontrado');

 let estoqueAtual = Number(p.estoque ?? 0);
 let item = venda.find(v => v.codigo == p.codigo);
 let quantidadeNoCarrinho = item ? Number(item.qtd || 0) : 0;

 // Impede vender mais do que existe no estoque.
 if(quantidadeNoCarrinho + qtd > estoqueAtual){
  return alert(
   `⚠️ ESTOQUE INSUFICIENTE\n\n` +
   `${p.nome}\n` +
   `Estoque disponível: ${estoqueAtual}\n` +
   `Já no carrinho: ${quantidadeNoCarrinho}\n` +
   `Quantidade solicitada: ${qtd}`
  );
 }

 if(item){
  item.qtd += qtd;
 } else {
  venda.push({...p,qtd:qtd});
 }

 // Reserva/baixa o estoque imediatamente ao colocar o produto no carrinho.
 p.estoque = estoqueAtual - qtd;

 beep();

 atualizar();

 salvar();
}

function remover(i){

 let item = venda[i];

 if(item){
  // Devolve ao estoque o que foi retirado quando o item entrou no carrinho.
  let prod = produtos.find(p => p.codigo == item.codigo);

  if(prod){
   prod.estoque = Number(prod.estoque ?? 0) + Number(item.qtd || 0);
  }
 }

 venda.splice(i,1);

 salvar();
 atualizar();
}

function carregarGrid(){

 gridProdutos.innerHTML='';

 produtos.forEach(p=>{

  gridProdutos.innerHTML += `
  
  <div class="prod" onclick="adicionar('${p.codigo}',1)">

   ${p.img ? `<img src="${p.img}">` : ''}

   <br>

   ${p.nome}

   <br>

   ${p.codigo}

  </div>
  `;
 });
}
function normalizarNomeCliente(nome){
 return String(nome || '').trim().toLowerCase();
}

function encontrarClienteFiado(nome){
 let chave = normalizarNomeCliente(nome);
 return clientes.find(c=>normalizarNomeCliente(c.nome)===chave) || null;
}

function nomeFiadoExistente(nome){
 let chave = normalizarNomeCliente(nome);
 return Object.keys(fiado).find(n=>normalizarNomeCliente(n)===chave) || null;
}

function salvarFiadoCompleto(){
 localStorage.setItem('fiado', JSON.stringify(fiado));
 localStorage.setItem('historicoFiado', JSON.stringify(historicoFiado));
}

function registrarMovimentoFiado(tipo, cliente, valor, detalhes={}){
 historicoFiado.push({
  tipo,
  cliente,
  valor:Number(valor||0),
  data:new Date().toISOString(),
  ...detalhes
 });
 salvarFiadoCompleto();
}

function abrirFiado(){
 mFiado.style.display='flex';

 let caixa = document.getElementById('listaFiado');
 if(!caixa) return;

 // Barra de pesquisa criada automaticamente dentro da tela de fiado.
 let buscaFiado = document.getElementById('buscaFiado');
 if(!buscaFiado){
  buscaFiado = document.createElement('input');
  buscaFiado.id='buscaFiado';
  buscaFiado.type='text';
  buscaFiado.placeholder='🔎 Pesquisar cliente...';
  buscaFiado.style.cssText='width:100%;box-sizing:border-box;padding:11px;margin:0 0 12px;border:1px solid #ddd;border-radius:8px;font-size:15px;';
  buscaFiado.addEventListener('input', listarFiados);
  caixa.parentNode.insertBefore(buscaFiado, caixa);
 }

 buscaFiado.value='';
 listarFiados();

 setTimeout(()=>buscaFiado.focus(),100);
}

function listarFiados(){
 let caixa = document.getElementById('listaFiado');
 if(!caixa) return;

 let termo = normalizarNomeCliente(document.getElementById('buscaFiado')?.value || '');
 let nomes = Object.keys(fiado)
  .filter(nome=>Number(fiado[nome]||0)>0)
  .filter(nome=>normalizarNomeCliente(nome).includes(termo))
  .sort((a,b)=>a.localeCompare(b,'pt-BR'));

 if(!nomes.length){
  caixa.innerHTML='<div style="padding:18px;text-align:center;color:#777">📒 Nenhuma dívida encontrada.</div>';
  return;
 }

 let totalGeral = nomes.reduce((s,n)=>s+Number(fiado[n]||0),0);

 caixa.innerHTML = `
  <div style="padding:10px;margin-bottom:12px;background:#fff7ed;border-radius:8px">
   <b>💰 Total a receber:</b> R$ ${totalGeral.toFixed(2)}
  </div>
 `;

 nomes.forEach(nome=>{
  let valor = Number(fiado[nome]||0);
  let cliente = encontrarClienteFiado(nome);
  let telefone = cliente?.telefone ? `📞 ${cliente.telefone}` : '';

  caixa.innerHTML += `
   <div style="margin-bottom:10px;padding:12px;background:#f1f5f9;border-radius:8px;border:1px solid #e2e8f0">
    <b>${nome}</b><br>
    ${telefone ? telefone+'<br>' : ''}
    <b style="font-size:17px">Dívida: R$ ${valor.toFixed(2)}</b><br><br>

   <button onclick="receberFiado(decodeURIComponent('${encodeURIComponent(nome)}'))"
     style="background:#22c55e;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer">
     💰 Receber
    </button>

   <button onclick="verHistoricoClienteFiado(decodeURIComponent('${encodeURIComponent(nome)}'))"
     style="margin-left:6px;padding:8px 12px;border-radius:6px;cursor:pointer">
     📜 Histórico
    </button>
   </div>
  `;
 });
}

function receberFiado(cliente){
 let nome = nomeFiadoExistente(cliente) || cliente;
 let divida = Number(fiado[nome]||0);

 if(divida<=0){
  alert('Não há dívida para receber.');
  return;
 }

 let valor = prompt(
  `💰 RECEBER FIADO\n\nCliente: ${nome}\nDívida atual: R$ ${divida.toFixed(2)}\n\nDigite o valor recebido:`,
  divida.toFixed(2)
 );

 if(valor===null) return;

 valor = parseFloat(String(valor).replace(',','.'));

 if(!Number.isFinite(valor) || valor<=0){
  alert('Valor inválido');
  return;
 }

 if(valor > divida){
  alert(`O valor recebido não pode ser maior que a dívida.\n\nDívida atual: R$ ${divida.toFixed(2)}`);
  return;
 }

 let escolha = prompt(
  'Forma do recebimento:\n1 - Dinheiro\n2 - Pix\n3 - Cartão',
  '1'
 );

 if(escolha===null) return;

 let formaRecebimento =
  escolha==='2' || String(escolha).toLowerCase()==='pix' ? 'Pix' :
  escolha==='3' || String(escolha).toLowerCase()==='cartão' || String(escolha).toLowerCase()==='cartao' ? 'Cartão' :
  'Dinheiro';

 fiado[nome] = Number((divida-valor).toFixed(2));

 if(fiado[nome] <= 0.009){
  delete fiado[nome];
 }

 // O recebimento entra no caixa da sessão atual.
 if(formaRecebimento==='Dinheiro') caixaResumo.dinheiro = Number(caixaResumo.dinheiro||0) + valor;
 if(formaRecebimento==='Pix') caixaResumo.pix = Number(caixaResumo.pix||0) + valor;
 if(formaRecebimento==='Cartão') caixaResumo.cartao = Number(caixaResumo.cartao||0) + valor;

 registrarMovimentoFiado('Recebimento', nome, valor, {
  forma:formaRecebimento,
  saldoAnterior:divida,
  saldoRestante:Number(fiado[nome]||0)
 });

 localStorage.setItem('caixaResumo', JSON.stringify(caixaResumo));
 salvar();

 let restante = Number(fiado[nome]||0);

 alert(
  restante>0
   ? `✅ Recebimento registrado!\n\nCliente: ${nome}\nRecebido: R$ ${valor.toFixed(2)}\nForma: ${formaRecebimento}\nRestante: R$ ${restante.toFixed(2)}`
   : `✅ Dívida quitada!\n\nCliente: ${nome}\nRecebido: R$ ${valor.toFixed(2)}\nForma: ${formaRecebimento}`
 );

 listarFiados();
 atualizar();
}

function verHistoricoClienteFiado(cliente){
 let nome = nomeFiadoExistente(cliente) || cliente;
 let movimentos = historicoFiado
  .filter(m=>normalizarNomeCliente(m.cliente)===normalizarNomeCliente(nome))
  .sort((a,b)=>new Date(b.data)-new Date(a.data));

 let texto = `📜 HISTÓRICO DO FIADO\n\nCliente: ${nome}\nDívida atual: R$ ${Number(fiado[nome]||0).toFixed(2)}\n\n`;

 if(!movimentos.length){
  texto += 'Nenhum movimento registrado ainda.';
 }else{
  movimentos.forEach(m=>{
   let data = new Date(m.data).toLocaleString('pt-BR');
   texto += `${m.tipo==='Lançamento' ? '📒' : '💰'} ${data}\n`;
   texto += `${m.tipo}: R$ ${Number(m.valor||0).toFixed(2)}`;
   if(m.forma) texto += ` — ${m.forma}`;
   if(m.saldoRestante!==undefined) texto += `\nSaldo: R$ ${Number(m.saldoRestante||0).toFixed(2)}`;
   texto += '\n\n';
  });
 }

 alert(texto);
}

function resumoHoje(){
  const hoje = new Date();
  return historico.filter(v=>{
    const d = new Date(v.data);
    return d.getFullYear() === hoje.getFullYear() &&
           d.getMonth() === hoje.getMonth() &&
           d.getDate() === hoje.getDate();
  });
}
function atualizar(){

 const elLista = document.getElementById('lista');
 const elTotal = document.getElementById('total');
 const elTotalPagamento = document.getElementById('totalPagamento');
 const elItens = document.getElementById('cItens');
 const elProdutos = document.getElementById('cProd');
 const elTotalMes = document.getElementById('cTotal');
 const elVendas = document.getElementById('cVenda');
 const elFiado = document.getElementById('cFiado');
 const elValorPago = document.getElementById('valorPago');
 const elTroco = document.getElementById('troco');
 const elUltimaVenda = document.getElementById('ultimaVenda');

 if(!elLista) return;

 elLista.innerHTML='';

 let totalVenda = 0;

 venda.forEach((v,i)=>{

  elLista.innerHTML += `
  
  <tr>

   <td>
    ${v.img ? `<img src="${v.img}" width="40">` : ''}
   </td>

   <td>${v.codigo}</td>

   <td>${v.nome}</td>

   <td>${v.qtd}</td>

   <td>
    ${(v.qtd * v.preco).toFixed(2)}
   </td>

   <td>
    <button onclick="remover(${i})">X</button>
   </td>

  </tr>
  `;

  totalVenda += v.qtd * v.preco;
 });

 elTotal.innerText = totalVenda.toFixed(2);

 elTotalPagamento.innerText = totalVenda.toFixed(2);

 elItens.innerText = venda.reduce((s,v)=>s + Number(v.qtd || 0), 0);

 // Os cards Total e Vendas mostram o acumulado do período ativo (mês),
 // enquanto Itens continua mostrando os itens da venda em andamento.
 let vendasHoje = resumoHoje();
let totalHoje = vendasHoje.reduce((s,v)=>s + Number(v.total || 0), 0);

elTotalMes.innerText = totalHoje.toFixed(2);
 elProdutos.innerText = produtos.length;

elVendas.innerText = vendasHoje.length;

 elFiado.innerText = Object.keys(fiado).length;


let pago = parseFloat(elValorPago.value || 0);

elTroco.innerText = (pago - totalVenda).toFixed(2);

let ultima = historico[historico.length - 1];

document.getElementById('ultimaVenda').innerText =
ultima
? `🧾 Última venda: R$ ${Number(ultima.total).toFixed(2)}`
: 'Última venda: Nenhuma';
carregarGrid();
}


function garantirBuscaProdutosGestao(){

 let lista = document.getElementById('listaProdutos');
 if(!lista) return;

 if(document.getElementById('buscaProdutoGestao')) return;

 let campo = document.createElement('input');
 campo.id = 'buscaProdutoGestao';
 campo.type = 'text';
 campo.placeholder = '🔎 Pesquisar por nome ou código...';
 campo.style.cssText = `
  width:100%;
  box-sizing:border-box;
  padding:12px;
  margin-bottom:12px;
  border:1px solid #ddd;
  border-radius:10px;
  font-size:15px;
 `;

 campo.addEventListener('input', filtrarProdutosGestao);

 lista.parentNode.insertBefore(campo, lista);
}

function abrirProdutos(){

 mProdutos.style.display='flex';

 garantirBuscaProdutosGestao();
 listarProdutos();

 setTimeout(()=>{
  let campo = document.getElementById("buscaProdutoGestao");
  if(campo) campo.focus();
 },300);
}

function filtrarProdutosGestao(){

 let campo = document.getElementById("buscaProdutoGestao");
 if(!campo) return;

 let termo = campo.value.trim().toLowerCase();

 if(!termo){
  listarProdutos();
  return;
 }

 let filtrados = produtos.filter(p =>
  String(p.nome||'').toLowerCase().includes(termo) ||
  String(p.codigo||'').toLowerCase().includes(termo)
 );

 listarProdutos(filtrados);
}

function salvarProduto(){

 produtos.push({

  nome:nome.value,

  codigo:codigo.value,

  preco:parseFloat(preco.value),

  estoque:parseInt(estoque.value),

  img:img.value

 });

 salvar();

 listarProdutos();

 carregarGrid();

 atualizar();
}




function listarProdutos(lista = produtos){

 listaProdutos.innerHTML='';

 if(!lista.length){
  listaProdutos.innerHTML = `
   <div style="padding:15px;text-align:center;color:#777">
    🔎 Nenhum produto encontrado.
   </div>
  `;
  return;
 }

 lista.forEach((p,i)=>{

  let estoqueAtual = Number(p.estoque ?? 0);

  let indiceReal = produtos.indexOf(p);

  listaProdutos.innerHTML += `

  <div style="
   margin-bottom:10px;
   padding:12px;
   background:#fff;
   border-radius:10px;
   border:1px solid #eee;
  ">
   <b>${p.nome}</b><br>
   Código: ${p.codigo || '-'}<br>
   Preço: R$ ${Number(p.preco||0).toFixed(2)}<br>
   Estoque: ${estoqueAtual}<br><br>

   <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:4px">
    <button onclick="editarProduto(${indiceReal})">
     ✏️ Editar
    </button>
    <button onclick="excluirProduto(${indiceReal})" style="background:#dc3545;color:#fff;border:0;border-radius:8px;padding:10px 14px;cursor:pointer">
     🗑️ Excluir
    </button>
   </div>
  </div>
  `;
 });
}

function editarProduto(i){

 let p = produtos[i];

 if(!p) return;

 let novoNome = prompt('Nome do produto:', p.nome);
 if(novoNome === null) return;

 let novoCodigo = prompt('Código do produto:', p.codigo || '');
 if(novoCodigo === null) return;

 let novoPreco = prompt('Preço:', String(p.preco ?? 0).replace('.',','));
 if(novoPreco === null) return;

 let novoEstoque = prompt('Estoque atual:', String(p.estoque ?? 0));
 if(novoEstoque === null) return;

 novoPreco = parseFloat(String(novoPreco).replace(',','.'));
 novoEstoque = parseInt(novoEstoque,10);

 if(!novoNome.trim() || !Number.isFinite(novoPreco) || novoPreco < 0){
  alert('Dados inválidos!');
  return;
 }

 if(!Number.isFinite(novoEstoque) || novoEstoque < 0){
  alert('Estoque inválido!');
  return;
 }

 p.nome = novoNome.trim();
 p.codigo = novoCodigo.trim();
 p.preco = novoPreco;
 p.estoque = novoEstoque;

 salvar();
 carregarGrid();
 listarProdutos();
 atualizar();
}


function excluirProduto(i){

 let p = produtos[i];
 if(!p) return;

 let nomeProduto = p.nome || 'este produto';

 if(!confirm(
  `⚠️ EXCLUIR PRODUTO\n\n` +
  `Você tem certeza que deseja excluir \"${nomeProduto}\"?\n\n` +
  `O produto será removido do cadastro e da tela de vendas.\n` +
  `O histórico de vendas antigas NÃO será apagado.`
 )) return;

 produtos.splice(i,1);

 salvar();

 listarProdutos();

 carregarGrid();

 atualizar();

 alert(`✅ Produto \"${nomeProduto}\" excluído do cadastro.`);
}




function abrirSelecionarClienteFiado(){

 let modal = document.getElementById('modalSelecionarClienteFiado');

 if(!modal){

  modal = document.createElement('div');
  modal.id = 'modalSelecionarClienteFiado';

  modal.style.cssText = `
   position:fixed; inset:0; background:rgba(0,0,0,.55);
   display:flex; align-items:center; justify-content:center;
   z-index:100001; padding:15px; box-sizing:border-box;
  `;

  modal.innerHTML = `
   <div style="background:#fff;width:100%;max-width:480px;max-height:80vh;
   border-radius:16px;padding:18px;box-sizing:border-box;display:flex;flex-direction:column">

    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
     <h3 style="margin:0">📒 Selecionar cliente do fiado</h3>
     <button id="fecharSelecionarClienteFiado" style="padding:7px 10px">✖</button>
    </div>

    <input id="buscaSelecionarClienteFiado" type="text"
     placeholder="🔎 Pesquisar cliente..."
     style="width:100%;box-sizing:border-box;padding:12px;margin:14px 0 10px;
     border:1px solid #ddd;border-radius:10px;font-size:16px">

    <div id="listaSelecionarClienteFiado"
     style="overflow-y:auto;max-height:55vh;padding-right:3px"></div>

   </div>
  `;

  document.body.appendChild(modal);

  document.getElementById('fecharSelecionarClienteFiado').onclick = ()=>{
   modal.style.display='none';
   clienteFiadoPendente='';
  };

  document.getElementById('buscaSelecionarClienteFiado').oninput = listarClientesParaFiado;
 }

 modal.style.display='flex';

 let busca = document.getElementById('buscaSelecionarClienteFiado');
 busca.value='';

 listarClientesParaFiado();

 setTimeout(()=>busca.focus(),50);
}

function listarClientesParaFiado(){

 let lista = document.getElementById('listaSelecionarClienteFiado');
 let busca = document.getElementById('buscaSelecionarClienteFiado');

 if(!lista) return;

 let termo = String(busca?.value || '').trim().toLowerCase();

 let filtrados = clientes.filter(c=>{
  let nome = String(c.nome || '').toLowerCase();
  let telefone = String(c.telefone || '').toLowerCase();

  return !termo || nome.includes(termo) || telefone.includes(termo);
 });

 lista.innerHTML='';

 if(!filtrados.length){
  lista.innerHTML='<div style="padding:18px;text-align:center;color:#777">Nenhum cliente encontrado.</div>';
  return;
 }

 filtrados.forEach(cliente=>{

  let chave = nomeFiadoExistente(cliente.nome) || cliente.nome;
  let divida = Number(fiado[chave] || 0);

  let botao = document.createElement('button');

  botao.style.cssText = `
   width:100%;text-align:left;padding:13px;margin-bottom:8px;
   border:1px solid #eee;border-radius:10px;background:#fff;
   cursor:pointer;font-size:15px
  `;

  botao.innerHTML = `
   <b>👤 ${cliente.nome}</b><br>
   ${cliente.telefone ? `<span style="font-size:13px;color:#666">📞 ${cliente.telefone}</span><br>` : ''}
   ${divida>0 ? `<span style="font-size:13px">📒 Dívida atual: R$ ${divida.toFixed(2)}</span>` : '<span style="font-size:13px;color:#666">Sem dívida anterior</span>'}
  `;

  botao.onclick = ()=>escolherClienteFiado(cliente.nome);

  lista.appendChild(botao);
 });
}

function escolherClienteFiado(nome){

 let cliente = encontrarClienteFiado(nome);

 if(!cliente){
  alert('Cliente não encontrado.');
  return;
 }

 clienteFiadoPendente = cliente.nome;

 let modal = document.getElementById('modalSelecionarClienteFiado');
 if(modal) modal.style.display='none';

 alert(
  `📒 Fiado selecionado!\n\n` +
  `Cliente: ${cliente.nome}\n` +
  `Valor: R$ ${total.innerText}\n\n` +
  `Agora é só finalizar a venda.`
 );
}



function setForma(f){

 let totalVenda = parseFloat(total.innerText) || 0;

 if(totalVenda<=0){
  alert('Não há itens na venda.');
  return;
 }

 if(f === 'Fiado'){

  if(!clientes.length){
   alert('Cadastre o cliente antes de lançar uma venda no fiado.');
   return;
  }

  forma = 'Fiado';
  pagamentos = [{tipo:'Fiado',valor:totalVenda}];

  valorPago.value = totalVenda.toFixed(2);
  troco.innerText = '0.00';

  abrirSelecionarClienteFiado();

  return;
 }

 forma = f;
 clienteFiadoPendente = '';

 let valor = prompt('Valor para ' + f);

 if(valor === null) return;

 valor = parseFloat(String(valor).replace(',','.'));

 if(isNaN(valor) || valor <= 0){

  alert('Valor inválido');

  return;
 }

 pagamentos = [{tipo:f,valor:valor}];

 let totalPago = pagamentos.reduce((s,p)=>s+p.valor,0);

 valorPago.value = totalPago.toFixed(2);

 troco.innerText = (totalPago - totalVenda).toFixed(2);
}


function finalizarVenda(){

if(venda.length === 0){
alert("Nenhum item na venda!");
return;
}

let totalVenda = venda.reduce((s,v)=>
s + (v.preco * v.qtd),0);

if(!forma){
 alert('Selecione a forma de pagamento antes de finalizar.');
 return;
}

if(forma !== 'Fiado'){
 let pago = pagamentos.reduce((s,p)=>s+Number(p.valor||0),0);
 if(pago < totalVenda){
  alert(`Valor recebido insuficiente.\n\nTotal: R$ ${totalVenda.toFixed(2)}\nRecebido: R$ ${pago.toFixed(2)}`);
  return;
 }
}

let clienteVenda = '';

if(forma === 'Fiado'){
 if(!clienteFiadoPendente){
  alert('Selecione o cliente do fiado antes de finalizar.');
  return;
 }

 let nomeReal = clienteFiadoPendente;
 let nomeExistente = nomeFiadoExistente(nomeReal) || nomeReal;

 fiado[nomeExistente] = Number(fiado[nomeExistente]||0) + totalVenda;
 clienteVenda = nomeExistente;

 registrarMovimentoFiado('Lançamento', nomeExistente, totalVenda, {
  forma:'Fiado',
  saldoRestante:Number(fiado[nomeExistente]||0)
 });
}

historico.push({
 itens:[...venda],
 total: totalVenda,
 forma: forma || "Não informado",

 delivery: deliveryAtivo,

 cliente: deliveryAtivo ? dadosDelivery.nome : clienteVenda,
 endereco: deliveryAtivo ? dadosDelivery.endereco : "",
 telefone: deliveryAtivo ? dadosDelivery.telefone : "",
 taxaEntrega: deliveryAtivo ? dadosDelivery.taxa : 0,

 data: new Date()
});

if(forma === "Dinheiro"){
caixaResumo.dinheiro += totalVenda;
}

if(forma === "Pix"){
caixaResumo.pix += totalVenda;
}

if(forma === "Cartão"){
caixaResumo.cartao += totalVenda;
}

if(forma === "Fiado"){
caixaResumo.fiado += totalVenda;
}

localStorage.setItem('hist', JSON.stringify(historico));
localStorage.setItem('caixaResumo', JSON.stringify(caixaResumo));
salvar();
contadorVendasCaixa++;
localStorage.setItem('contadorVendasCaixa', String(contadorVendasCaixa));

alert(
 forma==='Fiado'
 ? `✅ Venda finalizada!\n\n📒 Lançada no fiado de ${clienteVenda}.\nValor: R$ ${totalVenda.toFixed(2)}`
 : "Venda finalizada com sucesso!"
);

if(confirm('Imprimir cupom?')){
 imprimirCupom(totalVenda);
}

venda = [];
pagamentos = [];
forma = '';
clienteFiadoPendente = '';
deliveryAtivo = false;
dadosDelivery = {};

valorPago.value = '';
troco.innerText = '0.00';

atualizar();

}
function ativarDelivery(){

 let nomes = clientes.map(c => c.nome).join('\n');

let nome = prompt(
"Digite o cliente:\n\nClientes cadastrados:\n" + nomes
);
 let cliente = clientes.find(
  c => c.nome.toLowerCase() === nome.toLowerCase()
 );

 if(!cliente){
  alert('Cliente não encontrado!');
  return;
 }

 let taxa = prompt('Taxa de entrega:');

 taxa = parseFloat(taxa || 0);

 if(isNaN(taxa)){
  taxa = 0;
 }

 deliveryAtivo = true;

 dadosDelivery = {
  nome: cliente.nome,
  endereco: cliente.endereco,
  telefone: cliente.telefone,
  taxa: taxa
 };

 venda.push({
  nome:'Taxa Delivery',
  codigo:'ENT',
  preco:taxa,
  qtd:1
 });

 atualizar();

alert(`
🚚 Delivery ativado!

Cliente:
${cliente.nome}

Endereço:
${cliente.endereco}
`);
}



function abrirCaixa(){
 if(caixaAberto){
  alert('🔓 O caixa já está aberto!\n\nFeche o caixa atual antes de abrir um novo.');
  return;
 }

 let valor = prompt('💰 ABERTURA DO CAIXA\n\nDigite o valor inicial do caixa:');
 if(valor === null) return;

 valor = parseFloat(String(valor).replace(',','.'));
 if(!Number.isFinite(valor) || valor < 0){
  alert('Valor inválido!');
  return;
 }

 // NOVA SESSÃO: zera somente os acumuladores do caixa atual.
 // O histórico de vendas e as sangrias antigas continuam salvos.
 caixaResumo = {
  dinheiro:0,
  pix:0,
  cartao:0,
  fiado:0,
  delivery:0
 };

 sangriasCaixa = {
  dinheiro:0,
  pix:0
 };

 aberturaCaixa = valor;
 caixaAberto = true;
 contadorVendasCaixa = 0;

 localStorage.setItem('caixaResumo', JSON.stringify(caixaResumo));
 localStorage.setItem('sangriasCaixa', JSON.stringify(sangriasCaixa));
 localStorage.setItem('aberturaCaixa', JSON.stringify(aberturaCaixa));
 localStorage.setItem('caixaAberto', JSON.stringify(caixaAberto));
 localStorage.setItem('contadorVendasCaixa', String(contadorVendasCaixa));

 alert(
  `🔓 CAIXA ABERTO!\n\n` +
  `💰 Valor inicial: R$ ${valor.toFixed(2)}\n\n` +
  `✅ Vendas e sangrias da nova sessão começaram em zero.`
 );
}


function resumoCaixaHoje(){
 let brutoDinheiro = Number(caixaResumo.dinheiro || 0) + Number(sangriasCaixa.dinheiro || 0);
 let pix = Number(caixaResumo.pix || 0) + Number(sangriasCaixa.pix || 0);
 let cartao = Number(caixaResumo.cartao || 0);
 let fiado = Number(caixaResumo.fiado || 0);
 let delivery = Number(caixaResumo.delivery || 0);

 let sangDinheiro = Number(sangriasCaixa.dinheiro || 0);
 let sangPix = Number(sangriasCaixa.pix || 0);

 return {
  vendas: contadorVendasCaixa,
  brutoDinheiro,
  pix,
  cartao,
  fiado,
  delivery,
  sangDinheiro,
  sangPix,
  sangTotal:sangDinheiro+sangPix,
  dinheiroEsperado:Number(aberturaCaixa||0) + Number(caixaResumo.dinheiro||0),
  pixRestante:Number(caixaResumo.pix||0)
 };
}


function fecharCaixa(){
 let r = resumoCaixaHoje();

 let mensagem =
 `🔒 FECHAMENTO DE CAIXA\n\n` +
 `🧾 Vendas na sessão: ${r.vendas}\n\n` +
 `💰 ABERTURA\nR$ ${Number(aberturaCaixa||0).toFixed(2)}\n\n` +
 `💵 DINHEIRO VENDIDO\nR$ ${r.brutoDinheiro.toFixed(2)}\n` +
 `💸 Sangrias em dinheiro: R$ ${r.sangDinheiro.toFixed(2)}\n` +
 `📊 Dinheiro esperado no caixa: R$ ${r.dinheiroEsperado.toFixed(2)}\n\n` +
 `💠 PIX\nVendas: R$ ${r.pix.toFixed(2)}\n` +
 `Sangrias: R$ ${r.sangPix.toFixed(2)}\n` +
 `Saldo Pix: R$ ${r.pixRestante.toFixed(2)}\n\n` +
 `💳 Cartão: R$ ${r.cartao.toFixed(2)}\n` +
 `📒 Fiado: R$ ${r.fiado.toFixed(2)}\n` +
 `🚚 Delivery: R$ ${r.delivery.toFixed(2)}\n\n` +
 `💸 Total de sangrias: R$ ${r.sangTotal.toFixed(2)}\n\n` +
 `Digite o valor que você contou fisicamente no caixa:`;

 let totalContado = prompt(mensagem);
 if(totalContado === null) return;

 totalContado = parseFloat(String(totalContado).replace(',','.'));
 if(!Number.isFinite(totalContado) || totalContado < 0){
  alert('Valor inválido!');
  return;
 }

 let diferenca = totalContado - r.dinheiroEsperado;
 let status =
  diferenca > 0
   ? `🟢 SOBROU R$ ${diferenca.toFixed(2)}`
   : diferenca < 0
    ? `🔴 FALTOU R$ ${Math.abs(diferenca).toFixed(2)}`
    : '✅ CAIXA BATEU CERTINHO';

 let confirmacao = confirm(
  `🔒 CONFIRMAR FECHAMENTO?\n\n` +
  `Esperado: R$ ${r.dinheiroEsperado.toFixed(2)}\n` +
  `Contado: R$ ${totalContado.toFixed(2)}\n` +
  `${status}\n\n` +
  `Depois de confirmar, o caixa será zerado para a próxima abertura.`
 );

 if(!confirmacao) return;

 let fechamentosCaixa = JSON.parse(localStorage.getItem('fechamentosCaixa')) || [];

 fechamentosCaixa.push({
  data: new Date().toISOString(),
  abertura: Number(aberturaCaixa||0),
  vendas: r.vendas,
  dinheiroVendido: r.brutoDinheiro,
  sangriaDinheiro: r.sangDinheiro,
  pixVendido: r.pix,
  sangriaPix: r.sangPix,
  cartao: r.cartao,
  fiado: r.fiado,
  delivery: r.delivery,
  dinheiroEsperado: r.dinheiroEsperado,
  dinheiroContado: totalContado,
  diferenca
 });

 localStorage.setItem('fechamentosCaixa', JSON.stringify(fechamentosCaixa));

 caixaResumo = {
  dinheiro:0,
  pix:0,
  cartao:0,
  fiado:0,
  delivery:0
 };

 aberturaCaixa = 0;
 sangriasCaixa = {dinheiro:0,pix:0};
 caixaAberto = false;
 contadorVendasCaixa = 0;

 localStorage.setItem('caixaResumo', JSON.stringify(caixaResumo));
 localStorage.setItem('aberturaCaixa', aberturaCaixa);
 localStorage.setItem('sangriasCaixa', JSON.stringify(sangriasCaixa));
 localStorage.setItem('caixaAberto', JSON.stringify(false));
 localStorage.setItem('contadorVendasCaixa', '0');

 atualizar();

 alert(
  `✅ CAIXA FECHADO!\n\n` +
  `${status}\n\n` +
  `O próximo caixa começa zerado.\n` +
  `As vendas e sangrias continuam guardadas no histórico.`
 );
}



function abrirRelatorioProdutos(){

 let inicio = prompt(
  `📊 PRODUTOS MAIS VENDIDOS\n\n` +
  `Digite a data inicial no formato DD/MM/AAAA.\n` +
  `Deixe vazio para usar o mês atual.`
 );

 if(inicio === null) return;

 let fim = prompt(
  `Digite a data final no formato DD/MM/AAAA.\n` +
  `Deixe vazio para usar a mesma data inicial.`
 );

 if(fim === null) return;

 function converterData(valor){
  if(!valor || !valor.trim()) return null;
  let partes = valor.trim().split('/');
  if(partes.length !== 3) return null;
  let d = new Date(
   Number(partes[2]),
   Number(partes[1])-1,
   Number(partes[0]),
   23,59,59,999
  );
  return isNaN(d.getTime()) ? null : d;
 }

 let agora = new Date();
 let dataInicio = converterData(inicio);

 if(!dataInicio){
  dataInicio = new Date(agora.getFullYear(),agora.getMonth(),1,0,0,0,0);
 }

 let dataFim = converterData(fim);

 if(!dataFim){
  if(inicio && inicio.trim()){
   dataFim = new Date(dataInicio);
  }else{
   dataFim = new Date(agora.getFullYear(),agora.getMonth()+1,0,23,59,59,999);
  }
 }

 let vendasPeriodo = historico.filter(v=>{
  let d = new Date(v.data);
  return d >= dataInicio && d <= dataFim;
 });

 let mapa = {};

 vendasPeriodo.forEach(v=>{
  (v.itens || []).forEach(item=>{

   // Taxa Delivery e Venda Avulsa não entram no ranking de produtos.
   if(item.codigo === 'ENT' || item.codigo === 'AV') return;

   let chave = item.codigo || item.nome;

   if(!mapa[chave]){
    mapa[chave] = {
     nome:item.nome || 'Produto',
     codigo:item.codigo || '-',
     quantidade:0,
     faturamento:0
    };
   }

   let qtd = Number(item.qtd || 0);
   let preco = Number(item.preco || 0);

   mapa[chave].quantidade += qtd;
   mapa[chave].faturamento += qtd * preco;
  });
 });

 let ranking = Object.values(mapa).sort((a,b)=>{
  if(b.quantidade !== a.quantidade) return b.quantidade-a.quantidade;
  return b.faturamento-a.faturamento;
 });

 if(!ranking.length){
  alert('Nenhum produto vendido nesse período.');
  return;
 }

 let totalUnidades = ranking.reduce((s,p)=>s+p.quantidade,0);
 let faturamentoProdutos = ranking.reduce((s,p)=>s+p.faturamento,0);

 let texto =
 `📊 PRODUTOS MAIS VENDIDOS\n\n` +
 `Período: ${dataInicio.toLocaleDateString('pt-BR')} a ${dataFim.toLocaleDateString('pt-BR')}\n` +
 `Vendas no período: ${vendasPeriodo.length}\n` +
 `Unidades vendidas: ${totalUnidades}\n` +
 `Valor dos produtos: R$ ${faturamentoProdutos.toFixed(2)}\n\n`;

 ranking.forEach((p,i)=>{
  let medalha = i===0 ? '🥇' : i===1 ? '🥈' : i===2 ? '🥉' : `${i+1}.`;

  texto +=
   `${medalha} ${p.nome}\n` +
   `   Código: ${p.codigo}\n` +
   `   Quantidade: ${p.quantidade}\n` +
   `   Vendas: R$ ${p.faturamento.toFixed(2)}\n\n`;
 });

 let acao = prompt(
  texto +
  `\nDigite 1 para imprimir o ranking.\n` +
  `Clique em Cancelar para apenas consultar.`,
  '1'
 );

 if(acao === '1'){
  let tela = window.open('','','width=420,height=750');

  if(!tela){
   alert('O navegador bloqueou a impressão. Permita pop-ups para o PDV.');
   return;
  }

  let seguro = texto
   .replace(/&/g,'&amp;')
   .replace(/</g,'&lt;')
   .replace(/>/g,'&gt;');

  tela.document.write(`
   <html>
   <head>
    <title>Produtos mais vendidos</title>
    <style>
     body{font-family:monospace;width:360px;padding:15px;font-size:12px}
     h2{text-align:center}
     pre{white-space:pre-wrap}
    </style>
   </head>
   <body>
    <h2>SWEETCAKE</h2>
    <pre>${seguro}</pre>
   </body>
   </html>
  `);

  tela.document.close();
  setTimeout(()=>tela.print(),300);
 }
}

function dadosBackupCompleto(){
 return {
  versao: 2,
  dataBackup: new Date().toISOString(),

  produtos: produtos,
  historico: historico,
  clientes: clientes,
  fiado: fiado,
  historicoFiado: historicoFiado,

  caixaResumo: caixaResumo,
  aberturaCaixa: aberturaCaixa,
  sangrias: sangrias,
  sangriasCaixa: sangriasCaixa,
  caixaAberto: caixaAberto,
  contadorVendasCaixa: contadorVendasCaixa,
  fechamentosCaixa: JSON.parse(localStorage.getItem('fechamentosCaixa')) || [],

  metasMensais: metasMensais,
  fechamentosMensais: fechamentosMensais,
  periodoAtivo: periodoAtivo,
  senhaGestao: getSenhaGestao()
 };
}

function exportarBackup(){

 let dados = dadosBackupCompleto();

 let blob = new Blob(
  [JSON.stringify(dados, null, 2)],
  {type:'application/json'}
 );

 let a = document.createElement('a');
 a.href = URL.createObjectURL(blob);

 let agora = new Date();
 let dataArquivo =
  `${agora.getFullYear()}-${String(agora.getMonth()+1).padStart(2,'0')}-${String(agora.getDate()).padStart(2,'0')}`;

 a.download = `backup_sweetcake_${dataArquivo}.json`;
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);

 setTimeout(()=>URL.revokeObjectURL(a.href),1000);

 alert(
  `💾 BACKUP REALIZADO!\n\n` +
  `Produtos: ${produtos.length}\n` +
  `Vendas: ${historico.length}\n` +
  `Clientes: ${clientes.length}\n` +
  `Fiados: ${Object.keys(fiado).length}\n\n` +
  `Arquivo salvo com segurança.`
 );
}

function importarBackupArquivo(input){

 let arquivo = input.files && input.files[0];

 if(!arquivo) return;

 let leitor = new FileReader();

 leitor.onload = function(e){

  try{

   let dados = JSON.parse(e.target.result);

   if(!dados || !Array.isArray(dados.produtos) || !Array.isArray(dados.historico)){
    throw new Error('Arquivo de backup inválido.');
   }

   let confirmar = confirm(
    `⚠️ RESTAURAR BACKUP?\n\n` +
    `Data do backup: ${dados.dataBackup ? new Date(dados.dataBackup).toLocaleString('pt-BR') : 'não informada'}\n` +
    `Produtos: ${dados.produtos.length}\n` +
    `Vendas: ${dados.historico.length}\n\n` +
    `Isso substituirá os dados atuais do PDV.\n\n` +
    `Antes de restaurar, faça um backup atual se quiser preservá-lo.`
   );

   if(!confirmar){
    input.value='';
    return;
   }

   produtos = dados.produtos || [];
   historico = dados.historico || [];
   clientes = dados.clientes || [];
   fiado = dados.fiado || {};
   historicoFiado = dados.historicoFiado || [];

   caixaResumo = dados.caixaResumo || {
    dinheiro:0,
    pix:0,
    cartao:0,
    fiado:0,
    delivery:0
   };

   aberturaCaixa = Number(dados.aberturaCaixa || 0);
   sangrias = dados.sangrias || [];
   sangriasCaixa = dados.sangriasCaixa || {dinheiro:0,pix:0};
   caixaAberto = Boolean(dados.caixaAberto);
   contadorVendasCaixa = Number(dados.contadorVendasCaixa || 0);

   metasMensais = dados.metasMensais || {};
   fechamentosMensais = dados.fechamentosMensais || [];
   periodoAtivo = dados.periodoAtivo || chaveMes();
   if(dados.senhaGestao){ localStorage.setItem('senhaGestao', String(dados.senhaGestao)); }

   localStorage.setItem('produtos',JSON.stringify(produtos));
   localStorage.setItem('hist',JSON.stringify(historico));
   localStorage.setItem('fiado',JSON.stringify(fiado));
   localStorage.setItem('historicoFiado',JSON.stringify(historicoFiado));
   localStorage.setItem('clientes',JSON.stringify(clientes));

   localStorage.setItem('caixaResumo',JSON.stringify(caixaResumo));
   localStorage.setItem('aberturaCaixa',JSON.stringify(aberturaCaixa));
   localStorage.setItem('sangrias',JSON.stringify(sangrias));
   localStorage.setItem('sangriasCaixa',JSON.stringify(sangriasCaixa));
   localStorage.setItem('caixaAberto',JSON.stringify(caixaAberto));
   localStorage.setItem('contadorVendasCaixa',String(contadorVendasCaixa));

   localStorage.setItem('metasMensais',JSON.stringify(metasMensais));
   localStorage.setItem('fechamentosMensais',JSON.stringify(fechamentosMensais));
   localStorage.setItem('periodoAtivo',periodoAtivo);

   let fechamentosCaixa = dados.fechamentosCaixa || [];
   localStorage.setItem('fechamentosCaixa',JSON.stringify(fechamentosCaixa));

   carregarGrid();
   listarProdutos();
   atualizar();

   alert(
    `✅ BACKUP RESTAURADO!\n\n` +
    `Produtos: ${produtos.length}\n` +
    `Vendas: ${historico.length}\n` +
    `Clientes: ${clientes.length}\n\n` +
    `O PDV foi atualizado com os dados do backup.`
   );

  }catch(erro){

   alert(
    `❌ Não foi possível restaurar o backup.\n\n` +
    `${erro.message || erro}`
   );

  }finally{
   input.value='';
  }
 };

 leitor.readAsText(arquivo);
}

function abrirRestaurarBackup(){

 let input = document.getElementById('inputRestaurarBackup');

 if(!input){

  input = document.createElement('input');
  input.type = 'file';
  input.id = 'inputRestaurarBackup';
  input.accept = '.json,application/json';
  input.style.display = 'none';

  input.addEventListener('change',function(){
   importarBackupArquivo(this);
  });

  document.body.appendChild(input);
 }

 input.value='';
 input.click();
}


function restaurarBackup(){ abrirRestaurarBackup(); }
function fazerSangria(){
 let saldoDinheiro = Number(caixaResumo.dinheiro || 0);
 let saldoPix = Number(caixaResumo.pix || 0);

 let valor = prompt(
  `💸 SANGRIA\n\nSaldo de vendas em dinheiro: R$ ${saldoDinheiro.toFixed(2)}\nSaldo de vendas em Pix: R$ ${saldoPix.toFixed(2)}\n\nDigite o valor da sangria:`
 );
 if(valor === null) return;
 valor = parseFloat(String(valor).replace(',','.'));
 if(!Number.isFinite(valor) || valor <= 0){
  alert('Valor inválido!');
  return;
 }

 let formaSangria = prompt(
  'Forma da sangria:\n1 - Dinheiro\n2 - Pix',
  '1'
 );
 if(formaSangria === null) return;

 formaSangria = String(formaSangria).trim();
 formaSangria =
  formaSangria === '2' || formaSangria.toLowerCase() === 'pix'
   ? 'Pix'
   : 'Dinheiro';

 let saldoDisponivel = formaSangria === 'Pix' ? saldoPix : saldoDinheiro;

 if(valor > saldoDisponivel){
  alert(
   `Não é possível fazer esta sangria.\n\n` +
   `Saldo disponível em ${formaSangria}: R$ ${saldoDisponivel.toFixed(2)}`
  );
  return;
 }

 let motivo = prompt('Motivo da sangria (opcional):');
 if(motivo === null) motivo = '';

 if(!confirm(
  `Confirmar sangria?\n\n` +
  `Forma: ${formaSangria}\n` +
  `Valor: R$ ${valor.toFixed(2)}\n` +
  `Motivo: ${motivo || 'Sem motivo'}`
 )) return;

 sangrias.push({
  valor,
  forma: formaSangria,
  motivo: motivo || 'Sem motivo',
  data: new Date().toISOString()
 });

 if(formaSangria === 'Dinheiro'){
  caixaResumo.dinheiro = Math.max(0, saldoDinheiro - valor);
 }else{
  caixaResumo.pix = Math.max(0, saldoPix - valor);
 }

 localStorage.setItem('sangrias', JSON.stringify(sangrias));
 localStorage.setItem('caixaResumo', JSON.stringify(caixaResumo));
 localStorage.setItem('sangriasCaixa', JSON.stringify(sangriasCaixa));

 atualizar();

 alert(
  `✅ Sangria registrada!\n\n` +
  `Forma: ${formaSangria}\n` +
  `Valor: R$ ${valor.toFixed(2)}\n` +
  `Motivo: ${motivo || 'Sem motivo'}\n\n` +
  `Saldo restante: R$ ${(
    formaSangria === 'Pix' ? caixaResumo.pix : caixaResumo.dinheiro
  ).toFixed(2)}`
 );
}

function cancelarUltimaVenda(){

 if(!historico.length){

  alert('Nenhuma venda para cancelar!');

  return;
 }

 if(!confirm('Cancelar última venda?')) return;

 let ultima = historico.pop();

 ultima.itens.forEach(item=>{

  let prod = produtos.find(
   p => p.codigo === item.codigo
  );

  if(prod){
   prod.estoque += item.qtd;
  }
 });

 salvar();
 localStorage.setItem('hist', JSON.stringify(historico));

 atualizar();

 alert('❌ Última venda cancelada!');
}
document.addEventListener('keydown', function(e){
 if(e.key !== 'Escape') return;

 let modalProdutos = document.getElementById('mProdutos');

 if(modalProdutos && modalProdutos.style.display !== 'none'){
  fechar('mProdutos');
  return;
 }

 let modalEstoque = document.getElementById('mEstoque');
 if(modalEstoque && modalEstoque.style.display !== 'none'){
  fechar('mEstoque');
 }
});

function limparBotoesGestaoDuplicados(){

 let botoes = Array.from(document.querySelectorAll('button'));

 // Remove o botão de Configurações antigo que só servia para indicar
 // que a senha seria colocada ali. A senha agora fica dentro de Gestão.
 botoes.forEach(btn=>{
  let texto = (btn.innerText || btn.textContent || '').trim().toLowerCase();

  if(texto.includes('configurações') || texto.includes('configuracoes')){
   btn.remove();
  }
 });

 // Mantém somente o primeiro botão que abre a Gestão/Metas.
 let gestao = botoes.filter(btn=>{
  let acao = btn.getAttribute('onclick') || '';
  return acao.includes('abrirGestao');
 });

 gestao.slice(1).forEach(btn=>btn.remove());
}

window.onload = () => {

 limparBotoesGestaoDuplicados();

 if(localStorage.getItem("produtos")){
  produtos = JSON.parse(localStorage.getItem("produtos"));
 }

 carregarGrid();

 atualizar();

 setTimeout(() => {
let aberto = document.getElementById("mProdutos");

if(aberto && aberto.style.display !== "flex"){

document.getElementById("busca").focus();

}  
 }, 500);

};

function salvarDados(){
  localStorage.setItem("produtos", JSON.stringify(produtos));
}
function salvarProdutos(){
localStorage.setItem("produtos", JSON.stringify(produtos));
}

function carregarProdutos(){
let dados = localStorage.getItem("produtos");

if(dados){
produtos = JSON.parse(dados);
listarProdutos();
}

}
 
function fazerBackup(){

    let dados = {
        produtos: produtos,
        historico: historico,
        clientes: clientes,
        fiado: fiado,
        caixaResumo: caixaResumo,
        sangrias: sangrias,
        metasMensais: metasMensais,
        fechamentosMensais: fechamentosMensais,
        periodoAtivo: periodoAtivo
    };

    let texto = JSON.stringify(dados, null, 2);

    let blob = new Blob([texto], {
        type:"application/json"
    });

    let link = document.createElement("a");

    link.href = URL.createObjectURL(blob);

    link.download = "backup.json";

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    alert("Backup baixado com sucesso!");

}
function fazerLogin(){

 let usuario = document.getElementById("usuario").value.trim();
 let senha = document.getElementById("senha").value.trim();

 // ADMIN
 if(usuario === "admin" && senha === "1234"){

  localStorage.setItem("nivelUsuario","admin");

  document.getElementById("loginTela").style.display = "none";

  alert("Bem-vindo Administrador");

  return;
 }

 // FUNCIONÁRIOS
 let usuarios = JSON.parse(
  localStorage.getItem("usuarios")
 ) || [];

 let funcionario = usuarios.find(u =>
  u.usuario === usuario &&
  u.senha === senha
 );

 if(funcionario){

  localStorage.setItem(
   "nivelUsuario",
   "funcionario"
  );

  document.getElementById("loginTela").style.display = "none";

  alert(
   "Bem-vindo " + funcionario.nome
  );

  return;
 }

 alert("Usuário ou senha incorretos!");
}






/* ESC — fechar telas do sistema */
document.addEventListener('keydown', function(e){
 if(e.key !== 'Escape') return;

 // Se estiver digitando senha, deixa o próprio modal da senha cuidar do ESC.
 let senhaModal = document.getElementById('modalSenhaGestao');
 if(senhaModal && senhaModal.style.display === 'flex') return;

 // Fecha qualquer seletor do fiado.
 let seletorFiado = document.getElementById('modalSelecionarClienteFiado');
 if(seletorFiado && seletorFiado.style.display === 'flex'){
  seletorFiado.style.display = 'none';
  return;
 }

 // Fecha todas as telas/abas principais abertas.
 [
  'mFiado',
  'mClientes',
  'mGestao',
  'mHistorico',
  'mProdutos',
  'mEstoque'
 ].forEach(id=>{
  let el = document.getElementById(id);
  if(el && el.style.display === 'flex'){
   el.style.display = 'none';
  }
 });
}, true);


// ATALHOS DO PDV
document.addEventListener("keydown", function(e){
 if(e.key === "F1"){ e.preventDefault(); e.stopPropagation(); setForma("Dinheiro"); }
 if(e.key === "F2"){ e.preventDefault(); e.stopPropagation(); setForma("Pix"); }
 if(e.key === "F3"){ e.preventDefault(); e.stopPropagation(); setForma("Cartão"); }
 if(e.key === "F4"){ e.preventDefault(); e.stopPropagation(); setForma("Fiado"); }
 if(e.key === "F6"){ e.preventDefault(); e.stopPropagation(); finalizarVenda(); }
 if(e.key === "F7"){ e.preventDefault(); e.stopPropagation(); cancelarItemVenda(); }
}, true);


function imprimirCupom(totalVenda){

let texto = `
<html>
<head>
<style>

body{
font-family: monospace;
width: 280px;
padding:10px;
font-size:12px;
}

h2{
text-align:center;
margin:0;
}

hr{
border:none;
border-top:1px dashed #000;
margin:5px 0;
}

.item{
margin-bottom:8px;
}

.total{
font-size:16px;
font-weight:bold;
text-align:center;
margin-top:10px;
}

.center{
text-align:center;
}

</style>
</head>

<body>

<h2>PREMIUM PDV</h2>

<div class="center">
CUPOM NÃO FISCAL
</div>

<hr>
`;

venda.forEach(v=>{

texto += `

<div class="item">

${v.nome}<br>

${v.qtd} x R$ ${v.preco.toFixed(2)}

<br>

<b>
R$ ${(v.qtd * v.preco).toFixed(2)}
</b>

</div>

`;

});

texto += `

<hr>

<div class="total">
TOTAL R$ ${totalVenda.toFixed(2)}
</div>

<br>

Pagamento:
${forma}

<br><br>

${new Date().toLocaleString()}

<br><br>

<div class="center">
Obrigado pela preferência!
</div>

</body>
</html>
`;

let tela = window.open('', '', 'width=300,height=600');

tela.document.write(texto);

tela.document.close();

setTimeout(()=>{

tela.print();
tela.close();
},500);

}
function abrirClientes(){

document.getElementById('mClientes').style.display = 'flex';

listarClientes();

}
function salvarCliente(){

let nome = document.getElementById('clienteNome').value;

let telefone = document.getElementById('clienteTelefone').value;

let endereco = document.getElementById('clienteEndereco').value;

if(!nome){
alert('Digite o nome');
return;
}

clientes.push({
nome,
telefone,
endereco
});

localStorage.setItem(
'clientes',
JSON.stringify(clientes)
);

document.getElementById('clienteNome').value = '';

document.getElementById('clienteTelefone').value = '';

document.getElementById('clienteEndereco').value = '';

listarClientes();

alert('Cliente salvo!');

}

function listarClientes(){

let lista = document.getElementById('listaClientes');

lista.innerHTML = '';

clientes.forEach((c,i)=>{

lista.innerHTML += `

<div style="
padding:10px;
margin-bottom:10px;
background:#f1f5f9;
border-radius:8px;
">

<b>${c.nome}</b><br>
📞 ${c.telefone}<br>
📍 ${c.endereco}

</div>

`;

});

}


function abrirRelatorio(){
 let lista = historico.slice().sort((a,b)=>new Date(b.data)-new Date(a.data));

 if(lista.length === 0){
  alert("Nenhuma venda encontrada!");
  return;
 }

 let hoje = new Date();
 let chaveHoje = chaveMes(hoje);
 let dataHoje = hoje.toLocaleDateString('pt-BR');

 let vendasHoje = lista.filter(v =>
  new Date(v.data).toLocaleDateString('pt-BR') === dataHoje
 );

 let totalHoje = vendasHoje.reduce((s,v)=>s+Number(v.total||0),0);

 let pagamentosHoje = {Dinheiro:0,Pix:0,Cartão:0,Fiado:0,Delivery:0};
 vendasHoje.forEach(v=>{
  let f = v.forma || "Não informado";
  if(Object.prototype.hasOwnProperty.call(pagamentosHoje,f)){
   pagamentosHoje[f] += Number(v.total||0);
  }
 });

 let resumo = `
📊 HISTÓRICO DE VENDAS

📅 Hoje: ${dataHoje}
🛒 Vendas hoje: ${vendasHoje.length}
💰 Total hoje: R$ ${totalHoje.toFixed(2)}

💵 Dinheiro: R$ ${pagamentosHoje.Dinheiro.toFixed(2)}
💠 Pix: R$ ${pagamentosHoje.Pix.toFixed(2)}
💳 Cartão: R$ ${pagamentosHoje.Cartão.toFixed(2)}
📒 Fiado: R$ ${pagamentosHoje.Fiado.toFixed(2)}
🚚 Delivery: R$ ${pagamentosHoje.Delivery.toFixed(2)}

Digite uma data para consultar:
Exemplo: 28/08/2026
`;

 let pesquisa = prompt(resumo);
 if(pesquisa === null || !pesquisa.trim()) return;

 pesquisa = pesquisa.trim();

 // Aceita DD/MM/AAAA e também AAAA-MM-DD.
 let vendasPesquisa = lista.filter(v=>{
  let d = new Date(v.data);
  if(isNaN(d)) return false;
  let br = d.toLocaleDateString('pt-BR');
  let iso = chaveMes(d) + '-' + String(d.getDate()).padStart(2,'0');
  return pesquisa === br || pesquisa === iso;
 });

 if(vendasPesquisa.length === 0){
  alert("Nenhuma venda encontrada nessa data!");
  return;
 }

 let totalPesquisa = vendasPesquisa.reduce((s,v)=>s+Number(v.total||0),0);
 let pag = {Dinheiro:0,Pix:0,Cartão:0,Fiado:0,Delivery:0};

 let detalhes = '';
 vendasPesquisa.forEach((v,i)=>{
  let data = new Date(v.data);
  let hora = data.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  let f = v.forma || "Não informado";
  if(Object.prototype.hasOwnProperty.call(pag,f)) pag[f] += Number(v.total||0);

  let itensTexto = (v.itens||[]).map(item =>
   `${item.qtd}x ${item.nome} — R$ ${(Number(item.qtd||0)*Number(item.preco||0)).toFixed(2)}`
  ).join('\n     ');

  detalhes += `
━━━━━━━━━━━━━━━━━━━━
🧾 VENDA ${i+1} — ${hora}
💰 R$ ${Number(v.total||0).toFixed(2)}
💳 ${f}
${v.delivery ? '🚚 DELIVERY\n' : ''}📦 ${itensTexto || 'Sem itens registrados'}
`;
 });

 let texto = `
📊 HISTÓRICO DO DIA
📅 ${pesquisa}

🛒 Vendas: ${vendasPesquisa.length}
💰 Total vendido: R$ ${totalPesquisa.toFixed(2)}

💵 Dinheiro: R$ ${pag.Dinheiro.toFixed(2)}
💠 Pix: R$ ${pag.Pix.toFixed(2)}
💳 Cartão: R$ ${pag.Cartão.toFixed(2)}
📒 Fiado: R$ ${pag.Fiado.toFixed(2)}
🚚 Delivery: R$ ${pag.Delivery.toFixed(2)}

${detalhes}
`;

 let acao = prompt(texto + "\n\nDigite 1 para imprimir este relatório ou Cancelar para sair.", "1");
 if(acao === "1"){
  let tela = window.open('','','width=420,height=750');
  if(!tela){
   alert("O navegador bloqueou a impressão. Permita pop-ups para o PDV.");
   return;
  }
  tela.document.write(`<html><head><title>Histórico ${pesquisa}</title>
  <style>
  body{font-family:monospace;width:360px;padding:15px;font-size:12px;white-space:pre-wrap}
  h2{text-align:center}
  </style></head><body><h2>SWEETCAKE</h2><pre>${texto.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</pre></body></html>`);
  tela.document.close();
  setTimeout(()=>{tela.print();},300);
 }
}

function importarBackup(){
  let input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.onchange = function(event){
    let arquivo = event.target.files[0];
    if(!arquivo) return;

    let leitor = new FileReader();

    leitor.onload = function(e){
      try{
        let dados = JSON.parse(e.target.result);

        produtos = dados.produtos || dados.estoque || [];
        clientes = dados.clientes || [];
        historico = dados.historico || dados.vendas || dados.hist || [];
        fiado = dados.fiado || {};
        caixaResumo = dados.caixaResumo || {dinheiro:0,pix:0,cartao:0,fiado:0,delivery:0};
        sangrias = dados.sangrias || [];
        metasMensais = dados.metasMensais || {};
        fechamentosMensais = dados.fechamentosMensais || [];
        periodoAtivo = dados.periodoAtivo || chaveMes(new Date());

        if(!metasMensais[periodoAtivo]) metasMensais[periodoAtivo] = META_BASE;

        localStorage.setItem('produtos', JSON.stringify(produtos));
        localStorage.setItem('clientes', JSON.stringify(clientes));
        localStorage.setItem('hist', JSON.stringify(historico));
        localStorage.setItem('fiado', JSON.stringify(fiado));
        localStorage.setItem('caixaResumo', JSON.stringify(caixaResumo));
        localStorage.setItem('sangrias', JSON.stringify(sangrias));
        salvarMetas();

        alert('Backup importado com sucesso!');
        location.reload();
      }catch(err){
        console.error(err);
        alert('Não foi possível importar este backup.');
      }
    };

    leitor.readAsText(arquivo);
  };

  input.click();
}

setInterval(() => {

 let campo = document.getElementById("busca");

 let loginTela = document.getElementById("loginTela");

 if(
   loginTela &&
   loginTela.style.display !== "none"
 ){
   return;
 }

 let modalClientes = document.getElementById("mClientes");

 if(
   modalClientes &&
   modalClientes.style.display === "flex"
 ){
   return;
 }

 let modalProdutos = document.getElementById("mProdutos");

 if(
   modalProdutos &&
   modalProdutos.style.display === "flex"
 ){
   return;
 }

 // Não rouba o foco quando a janela de senha da Gestão/Fechar Mês estiver aberta.
 let modalSenhaGestao = document.getElementById("modalSenhaGestao");

 if(
   modalSenhaGestao &&
   modalSenhaGestao.style.display !== "none"
 ){
   return;
 }

 // Também respeita qualquer campo que o usuário esteja digitando.
 let ativo = document.activeElement;

 if(
   ativo &&
   (
    ativo.tagName === "INPUT" ||
    ativo.tagName === "TEXTAREA" ||
    ativo.tagName === "SELECT"
   ) &&
   ativo !== campo
 ){
   return;
 }

 if(document.activeElement !== campo){

  campo.focus();

 }

}, 1000);
function editarPreco(i){

let novoNome = prompt(
'Nome do produto:',
produtos[i].nome
);

if(!novoNome) return;

let novoCodigo = prompt(
'Código do produto:',
produtos[i].codigo
);

if(!novoCodigo) return;

let novoPreco = prompt(
'Preço do produto:',
produtos[i].preco
);

if(!novoPreco) return;

novoPreco = parseFloat(
novoPreco.replace(',', '.')
);

if(isNaN(novoPreco) || novoPreco <= 0){
alert('Preço inválido!');
return;
}

produtos[i].nome = novoNome;

produtos[i].codigo = novoCodigo;

produtos[i].preco = novoPreco;

salvar();

listarProdutos();

carregarGrid();

atualizar();

alert('Produto atualizado!');

}
function reporEstoque(i){

let qtd = prompt(
'Quantidade para adicionar ao estoque:',
'1'
);

if(!qtd) return;

qtd = parseInt(qtd);

if(isNaN(qtd) || qtd <= 0){
alert('Quantidade inválida!');
return;
}

produtos[i].estoque += qtd;

salvar();

listarProdutos();

carregarGrid();

atualizar();

alert('Estoque atualizado!');

}
function cancelarItemVenda(){

 if(venda.length === 0){
  alert("Nenhum item na venda!");
  return;
 }

 let texto = "ITENS DA VENDA\n\n";

 venda.forEach((v,i)=>{
  texto += `${i+1} - ${v.nome} (${v.qtd}) - R$ ${(v.preco * v.qtd).toFixed(2)}\n`;
 });

 let item = prompt(
  texto + "\nDigite o número do item para cancelar:"
 );

 if(!item) return;

 item = parseInt(item) - 1;

 if(isNaN(item) || item < 0 || item >= venda.length){
  alert("Item inválido!");
  return;
 }

 let motivo = prompt("Motivo do cancelamento:");

 if(!motivo) return;

 let produtoCancelado = venda[item];

 let prodEstoque = produtos.find(p =>
  p.codigo === produtoCancelado.codigo
 );

 if(prodEstoque){
  prodEstoque.estoque += produtoCancelado.qtd;
 }

 venda.splice(item,1);

 salvar();
 atualizar();

 alert("Item cancelado com sucesso!");
}
function cadastrarFuncionario(){

 let nome = prompt("Nome do funcionário:");
 if(!nome) return;

 let usuario = prompt("Usuário de login:");
 if(!usuario) return;

 let senha = prompt("Senha:");
 if(!senha) return;

 let usuarios = JSON.parse(
  localStorage.getItem("usuarios")
 ) || [];

 usuarios.push({
  nome: nome,
  usuario: usuario,
  senha: senha
 });

 localStorage.setItem(
  "usuarios",
  JSON.stringify(usuarios)
 );

 alert("Funcionário cadastrado!");
}

// Inicialização e login
window.addEventListener('load', ()=>{
 let u=document.getElementById('usuario');
 let s=document.getElementById('senha');
 if(u) u.focus();
 [u,s].forEach(c=>{ if(c) c.addEventListener('keydown',e=>{ if(e.key==='Enter') fazerLogin(); }); });
});
