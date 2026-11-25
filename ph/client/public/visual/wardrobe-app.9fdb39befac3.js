
(() => {
  const $ = id => document.getElementById(id);
  const fields = ['hair','top','bottom','shoes','mask','face','action'];
  let assets = window.__alokPackedAssets || JSON.parse($('alok-data').textContent);
  delete window.__alokPackedAssets;
  const itemNameTranslations = window.CHEATIOSVIP_ITEM_NAMES_PTBR || {};
  for (const items of Object.values(assets.itemCatalog || {})) {
    for (const item of items) item.name = itemNameTranslations[item.name] || item.name;
  }
  const alokAssets={...assets};delete alokAssets.characters;
  const characterAssets={alok:alokAssets};
  delete assets.characters;
  const getVersion = () => window.currentAlokVersion || 'android-normal';
  const getVoice=()=> 'fish';
  const selection = () => Object.fromEntries(fields.map(k => [k, Number($(k).value)]));
  const picked = (field, s=selection()) => assets.itemCatalog[field][s[field]];
  let downloading = false,exportAbort;
  function reportMod(p,step){const n=Math.max(Number($('mod-progress-bar').value)||0,Math.min(100,Math.floor(p)));$('mod-progress-bar').value=n;$('mod-progress-percent').textContent=n+'%';$('mod-progress-step').textContent=step;}
  function startMod(){exportAbort=new AbortController();$('mod-progress-bar').value=0;$('mod-progress-percent').textContent='0%';$('mod-progress').hidden=false;$('mod-cancel').disabled=false;reportMod(0,'Verificando disponibilidade…');}
  function checkCancelled(){if(exportAbort.signal.aborted)throw new DOMException('Criação do arquivo cancelada','AbortError');}
  $('mod-cancel').addEventListener('click',()=>{exportAbort?.abort();window.alokCancelExport();});

  let fourDownloadUrls=[];
  window.addEventListener('beforeunload',()=>fourDownloadUrls.forEach(url=>URL.revokeObjectURL(url)));
  const storageKey = () => 'wardrobe-selection-'+assets.characterId+'-' + getVersion();
  const licenseApiUrl='https://api-production-182c.up.railway.app/api/license/validate';
  const licenseSessionKey='ph-xiter-visual-license';
  const visualDeviceId=()=>{
    let id='';try{id=sessionStorage.getItem('ph-xiter-visual-device')||'';}catch{}
    if(!id){id='web-'+crypto.randomUUID?.()||'web-'+Date.now()+'-'+Math.random().toString(36).slice(2);try{sessionStorage.setItem('ph-xiter-visual-device',id);}catch{}}
    return id;
  };
  const licenseState={valid:false,busy:false,key:''};
  const licenseMessage=(text,error=false)=>{const node=$('license-status');if(node){node.textContent=text;node.classList.toggle('error',error);}};
  const setLicenseState=(valid,key='')=>{licenseState.valid=valid;licenseState.key=key;window.dispatchEvent(new CustomEvent('ph-license-change',{detail:{valid}}));};
  async function validateVisualLicense(force=false){
    if(licenseState.busy)return false;
    let key='';try{key=sessionStorage.getItem(licenseSessionKey)||'';}catch{}
    key=String($('license-key')?.value||key).trim();
    if(!key){setLicenseState(false);licenseMessage('Digite sua key para liberar o Criar MOD.',true);$('license-key')?.focus();return false;}
    if(licenseState.valid&&!force&&licenseState.key===key)return true;
    licenseState.busy=true;setLicenseState(false);licenseMessage('Validando key na API…');
    const button=$('license-validate');if(button)button.disabled=true;
    let supportUrl='';
    try{
      const response=await fetch(licenseApiUrl,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({key,device_id:visualDeviceId(),package:'com.apple.mobile.MobileHouseArrest',app_version:'2026.10.07'})});
      const data=await response.json().catch(()=>({}));
      supportUrl=typeof data.supportUrl==='string'?data.supportUrl:'';
      if(response.status!==200||data.valid!==true)throw new Error(data.message||'Key inválida ou expirada.');
      try{sessionStorage.setItem(licenseSessionKey,key);}catch{}
      setLicenseState(true,key);licenseMessage(data.expiresAt?'Key válida até '+new Date(data.expiresAt).toLocaleString('pt-BR'):'Key válida. Criar MOD liberado.');
      const support=$('license-support');if(support)support.hidden=true;
      return true;
    }catch(error){
      setLicenseState(false);licenseMessage(error?.message||'Não foi possível validar a key agora.',true);
      const support=$('license-support');if(support){support.hidden=!/^https:\/\//i.test(supportUrl);if(!support.hidden){const link=support.querySelector('a');if(link)link.href=supportUrl;}}
      return false;
    }finally{licenseState.busy=false;if(button)button.disabled=false;}
  }
  window.phValidateBeforeExport=()=>validateVisualLicense();
  $('license-validate')?.addEventListener('click',()=>validateVisualLicense(true));
  $('license-key')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();validateVisualLicense(true);}});
  try{const saved=sessionStorage.getItem(licenseSessionKey);if(saved&&$('license-key'))$('license-key').value=saved;}catch{}
  function fileForSelection(s=selection()) {

    if((!assets.voiceProfile?.enabled||getVoice()==='alok') && fields.every(k=>picked(k,s).default)) return assets.originals[getVersion()];
    return {dynamic:true, url:'alok-phoi-cheo-'+getVersion()+'.zip'};
  }
  function setDefaults() {
    fields.forEach(k => $(k).value = String(assets.itemCatalog[k].findIndex(i=>i.default)));
  }
  const fullSetHairIds=new Set(['hair-alien-x','hair-nguoi-nhen-full-set','hair-caption-american']);
  const headOnlyHairIds=new Set(['hair-chien-binh-tho','hair-tho-black','hair-tho-pink','hair-tho-purple','hair-tho-quay','hair-tho-red','hair-tho-thien-ha','hair-tho-white','hair-tho-yellow','hair-quai-nhan-hu-khong']);
  function applyFullSetHair(){
    const hairId=picked('hair').id;
    const clearFields=fullSetHairIds.has(hairId)?['top','bottom','shoes','mask','face']:headOnlyHairIds.has(hairId)?['mask','face']:[];
    for(const field of clearFields){
      const index=assets.itemCatalog[field].findIndex(item=>item.id===field+'-xoa');
      if(index>=0&&[...$(field).options].some(option=>option.value===String(index)))$(field).value=String(index);
    }
  }
  const noShoesBottomIds=new Set(['bottom-quai-nhan-hu-khong-black','bottom-quai-nhan-hu-khong-blue','bottom-quai-nhan-hu-khong-white']);
  function applyBottomShoes(){
    if(!noShoesBottomIds.has(picked('bottom').id))return;
    const index=assets.itemCatalog.shoes.findIndex(item=>item.id==='shoes-xoa');
    if(index>=0&&[...$('shoes').options].some(option=>option.value===String(index)))$('shoes').value=String(index);
  }
  const titanTopIds=new Set(['top-titan-tien-cong','top-titan-thiet-giap']);
  const titanMaskIds=new Set(['mask-titan-tien-cong','mask-titan-thiet-giap']);
  function applyTitanRules(source){
    const clearFields=source==='top'&&titanTopIds.has(picked('top').id)?['bottom','shoes']:source==='mask'&&titanMaskIds.has(picked('mask').id)?['face']:[];
    for(const field of clearFields){
      const index=assets.itemCatalog[field].findIndex(item=>item.id===field+'-xoa');
      if(index>=0&&[...$(field).options].some(option=>option.value===String(index)))$(field).value=String(index);
    }
  }
  function applyMordecai(source){
    if(source&&(!['hair','mask'].includes(source)||picked(source).id!==source+'-mordecai'))return;
    if(!source&&picked('hair').id!=='hair-mordecai'&&picked('mask').id!=='mask-mordecai')return;
    for(const field of ['hair','top','bottom','shoes','mask','face']){
      const id=field+'-'+(['hair','mask'].includes(field)?'mordecai':'xoa');
      const index=assets.itemCatalog[field].findIndex(item=>item.id===id);
      if(index>=0&&[...$(field).options].some(option=>option.value===String(index)))$(field).value=String(index);
    }
  }
  function populate() {
    const inv = assets.versionInventory[getVersion()];
    fields.forEach(k => {
      $(k).replaceChildren();
      assets.itemCatalog[k].map((item,index) => ({item,index})).sort((a,b) => a.item.name.localeCompare(b.item.name,'pt-BR',{sensitivity:'base',numeric:true})).forEach(({item,index}) => {
        if(!inv[k].includes(item.id)) return;
        const option = new Option(item.name,String(index));
        option.dataset.itemId = item.id;
        $(k).add(option);
      });
    });
    setDefaults();
    let saved; try { saved=JSON.parse(localStorage.getItem(storageKey())); } catch {}
    if(saved && typeof saved==='object') fields.forEach(k => {
      const index=assets.itemCatalog[k].findIndex(i=>i.id===saved[k]);
      if([...$(k).options].some(o=>o.value===String(index))) $(k).value=String(index);
    });
    applyFullSetHair();applyTitanRules('top');applyBottomShoes();applyTitanRules('mask');applyMordecai();
  }
  function update() {
    const s=selection(), file=fileForSelection(s);
    const captions={hair:'Cabelo',top:'Camisa',bottom:'Calças',shoes:'Calçados',mask:'Máscara',face:'Rosto',action:assets.characterId==='ignis'?'Soco':'Ação'};
    $('selection-summary').textContent=fields.map(k=>captions[k]+': '+picked(k,s).name).join(' · ');
    if(assets.characterId==='alok')$('selection-summary').textContent+='';
    try { localStorage.setItem(storageKey(),JSON.stringify(Object.fromEntries(fields.map(k=>[k,picked(k,s).id])))); } catch {}
    $('download').disabled = downloading || !file || !licenseState.valid;
    $('download-all').disabled = downloading || !file || !licenseState.valid;
    $('download-all-label').textContent = downloading ? 'Preparando arquivo…' : 'Criar 4 versões';
    $('download-label').textContent = downloading ? 'Preparando arquivo…' : file
      ? (file.dynamic ? 'Criar MOD · '+(assets.mixEngine.bases[getVersion()].physicalSize/1048576).toFixed(2)+' MB' : (assets.characterId==='ignis'?'Baixar arquivo · ':'Baixar '+assets.characterName+' original · ')+(file.bytes/1048576).toFixed(2)+' MB')
      : 'Não há dados para exportar esta combinação';
    $('status').classList.remove('error');
    $('status').textContent = file
      ? (fields.every(k=>picked(k,s).default) ? 'Arquivo original da versão selecionada.' : '')
      : assets.mixExportDeferred.includes(getVersion())
        ? 'A exportação desta combinação para esta versão será adicionada quando houver mais dados.'
        : 'Esta combinação não tem dados de exportação.';
    window.dispatchEvent(new CustomEvent('wardrobe-change',{detail:s}));
  }
  window.alokWardrobe={get assets(){return assets;},selection,getVersion,getVoice,picked,fileForSelection,ready:Promise.resolve(assets.manifest)};
  window.addEventListener('ph-license-change',update);
  function updateCharacterLabels(){
    document.querySelector('.character-name').textContent=assets.characterName.toUpperCase();
    document.querySelector('.watermark').textContent='PH XITER';
    document.querySelector('.stage').setAttribute('aria-label','Prévia do personagem '+assets.characterName);
    $('fallback').alt=assets.characterName+' usando o visual selecionado';
    const isIgnis=assets.characterId==='ignis';
    const actionLabel=document.querySelector('label[for="action"]');
    actionLabel.lastChild.textContent=assets.characterId==='ignis'?'Soco':'Ação';
  }
  $('character').addEventListener('change',()=>{
    if(downloading){$('character').value=assets.characterId;return;}
    const next=characterAssets[$('character').value];
    assets=next;
    assets.manifest.combinations=assets.versionCombinations[getVersion()]||{};
    populate();updateCharacterLabels();update();
  });
  updateCharacterLabels();
  populate();
  fields.forEach(k=>$(k).addEventListener('change',()=>{if(k==='hair')applyFullSetHair();if(k==='bottom')applyBottomShoes();if(k==='top'||k==='mask')applyTitanRules(k);if(k==='hair'||k==='mask')applyMordecai(k);update();}));
  $('wardrobe-form').addEventListener('submit',e=>e.preventDefault());
  $('reset').addEventListener('click',()=>{setDefaults();update();});
  $('randomize').addEventListener('click',()=>{
    const before=JSON.stringify(selection());
    for(let trial=0;trial<12;trial++) {
      fields.forEach(k=>{
        const options=[...$(k).options].filter(option=>assets.itemCatalog[k][Number(option.value)].id!==k+'-xoa');
        if(options.length)$(k).value=options[Math.floor(Math.random()*options.length)].value;
      });
      if(JSON.stringify(selection())!==before) break;
    }
    applyFullSetHair();applyTitanRules('top');applyBottomShoes();applyTitanRules('mask');applyMordecai();update();
  });
  const versionLabels={'android-normal':'infinity','android-max':'infinity','ios-normal':'infinity','ios-max':'infinity'};
  function updateVersionLabels(){
    $('platform-label').textContent=versionLabels[getVersion()];
    const count=$('wardrobe-intro').querySelector('.count');if(count)count.textContent=versionLabels[getVersion()];
  }
  $('version').addEventListener('change',()=>{
    if(downloading)return;
    const chosen=Object.fromEntries(fields.map(k=>[k,picked(k).id]));
    window.currentAlokVersion=$('version').value;
    try{localStorage.setItem('alok-current-version',getVersion());}catch{}
    assets.manifest.combinations=assets.versionCombinations[getVersion()]||{};
    populate();
    fields.forEach(k=>{
      const index=assets.itemCatalog[k].findIndex(item=>item.id===chosen[k]);
      if([...$(k).options].some(option=>option.value===String(index)))$(k).value=String(index);
    });
    updateVersionLabels();update();
  });
  window.addEventListener('alok-version-change',()=>{populate();updateVersionLabels();update();});
  updateVersionLabels();
  $('download').addEventListener('click',async()=>{
    const chosen=selection(), version=getVersion(), file=fileForSelection(chosen); if(!file || downloading) return;
    if(!(await validateVisualLicense())){update();return;}
    downloading=true; update();startMod();
    const controls=[...document.querySelectorAll('select, #randomize, #reset, #download-all')];controls.forEach(el=>el.disabled=true);
    try {
      const ticket=await window.fishCheckExport(1);
      checkCancelled();await window.alokEnsureExport(p=>reportMod(2+p*.18,'Carregando dados para exportação…'),exportAbort.signal);checkCancelled();await new Promise(resolve=>requestAnimationFrame(resolve));
      let bytes;
      if(file.dynamic){
        bytes=await window.alokExport(chosen,version,p=>{
          reportMod(20+p*.7,'Montando o visual…');$('download-label').textContent='Criando arquivo… '+p+'%';
          $('status').textContent='Criando o arquivo com os itens e a versão selecionados.';
        });
      }else{
        const encoded=assets.downloads[file.url];if(!encoded)throw Error('Dados do ZIP indisponíveis.');
        const binary=atob(encoded);bytes=new Uint8Array(binary.length);
        for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
        if(bytes.length!==file.bytes)throw Error('O arquivo está incompleto.');
      }
      checkCancelled();$('mod-cancel').disabled=true;
      if(String(version).toLowerCase().startsWith('ios-')){
        reportMod(90,'Extraindo o AssetBundle iOS bruto…');
        const visualFile=window.phPrepareVisualDownload('optionalab_avatar',version,bytes);
        reportMod(96,'Enviando o AssetBundle para conversão .3105…');
        const nativeResult=window.phSendNativeTexture('optionalab_avatar',version,bytes);
        if(nativeResult===false)throw Error('O app não recebeu o AssetBundle iOS para converter em .3105.');
        const url=URL.createObjectURL(new Blob([visualFile.bytes],{type:'application/octet-stream'}));
        const link=document.createElement('a');link.href=url;link.download=visualFile.name;
        document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
        controls.forEach(el=>el.disabled=false);downloading=false;$('mod-progress').hidden=true;update();$('status').textContent='AssetBundle iOS baixado e enviado para conversão .3105. Aguarde o cartão Aplicar/Restaurar.';
        return;
      }
      const packaged=window.alokPackageDownload(bytes,version);
      checkCancelled();reportMod(95,'Finalizando o arquivo…');await window.fishChargeExport(ticket);
      const url=URL.createObjectURL(new Blob([packaged.bytes],{type:'application/zip'}));
      const link=document.createElement('a');link.href=url;link.download=packaged.name;
      document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
      controls.forEach(el=>el.disabled=false);downloading=false;$('mod-progress').hidden=true;update();$('status').textContent=(assets.characterId==='ignis'&&picked('top',chosen).id==='top-sasuke'?'A camisa do Sasuke foi exportada com os dados do IG38.':'AssetBundle iOS bruto baixado; convertendo para .3105…');
    } catch(err) {
      controls.forEach(el=>el.disabled=false);downloading=false;$('mod-progress').hidden=true;update();$('status').classList.add('error');$('status').textContent=err.name==='AbortError'?'Criação do arquivo cancelada.':'Falha no Criar MOD: '+err.message;
    }
  });
  $('download-all').addEventListener('click',async()=>{
    if(downloading)return;
    if(!(await validateVisualLicense())){update();return;}
    const chosen=selection();
    downloading=true;update();startMod();
    const controls=[...document.querySelectorAll('select, #randomize, #reset')];controls.forEach(el=>el.disabled=true);
    try{
      const ticket=await window.fishCheckExport(4);
      checkCancelled();await window.alokEnsureExport(p=>reportMod(2+p*.18,'Carregando dados para exportação…'),exportAbort.signal);checkCancelled();await new Promise(resolve=>requestAnimationFrame(resolve));
      const files=await window.alokExportAll(chosen,(p,label)=>{
        reportMod(20+p*.7,'Criando '+label+'…');$('download-all-label').textContent='Criando 4 versões… '+p+'%';
        $('status').textContent='Criando '+label+' a partir do mesmo visual selecionado.';
      });
      fourDownloadUrls.forEach(url=>URL.revokeObjectURL(url));fourDownloadUrls=[];
      const fileVersions={'Android_FF_THUONG.zip':'android-normal','Android_FF_MAX.zip':'android-max','iOS_FF_THUONG.zip':'ios-normal','iOS_FF_MAX.zip':'ios-max'};
      const readyFiles=Object.entries(files).map(([name,bytes])=>window.alokPackageDownload(bytes,fileVersions[name]));
      if(readyFiles.length!==4)throw Error('Não foi possível criar as 4 versões.');
      checkCancelled();reportMod(95,'Finalizando o arquivo…');$('mod-cancel').disabled=true;await window.fishChargeExport(ticket);
      const bundleEntries=Object.fromEntries(readyFiles.map(packaged=>[packaged.name,packaged.bytes]));
      const bundleBytes=fflate.zipSync(bundleEntries,{level:0});
      const bundleUrl=URL.createObjectURL(new Blob([bundleBytes],{type:'application/zip'}));
      const link=document.createElement('a');link.href=bundleUrl;link.download='CheatiOSVip_MOD_Free_Fire_4_VERSOES.zip';link.style.display='none';
      document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(bundleUrl),60000);
      controls.forEach(el=>el.disabled=false);downloading=false;$('mod-progress').hidden=true;update();
      $('status').textContent='ZIP com as 4 versões criado.';
    }catch(err){
      controls.forEach(el=>el.disabled=false);downloading=false;$('mod-progress').hidden=true;update();$('status').classList.add('error');$('status').textContent=err.name==='AbortError'?'Criação do arquivo cancelada.':'Não foi possível baixar as 4 versões: '+err.message;
    }
  });
  update();
})();
