'use strict';

(function bootHaeDok(){
  const SAVE_KEY = 'haedok-first-night-v2';
  const $ = (id) => document.getElementById(id);
  const traces = {
    clock:{title:'멈춘 시계',summary:'광장의 시계가 02시 17분에서 멈춰 있다.',detail:'바늘에는 먼지가 거의 없다. 오래 멈춘 물건이라기보다, 이 세계의 시간이 이 시각에서 고정된 것 같다.',note:'「시간이 멈춘 게 아니라, 누군가 세기를 포기한 것 같다.」'},
    statement:{title:'화영의 말',summary:'화영은 결계 밖에 나가본 적 없다고 말했다.',detail:'결계에 대한 질문이 끝나기도 전에 대답했다. 밖을 모른다기보다 그 이야기를 끝내고 싶어 하는 인상이 남았다.',note:'「정말 모르는 걸까, 아니면 기억하고 싶지 않은 걸까?」'},
    painting:{title:'결계 밖의 그림',summary:'화영의 방에 마을 바깥처럼 보이는 그림이 걸려 있다.',detail:'산의 능선과 무너진 표지판, 먼 곳의 불빛까지 구체적이다. 상상으로 그렸다고 하기엔 반복되는 디테일이 많다.',note:'「본 적 없는 곳을 이렇게 자세히 그릴 수 있을까?」'},
    scratch:{title:'결계의 긁힌 자국',summary:'결계 안쪽에서 바깥 방향으로 이어진 흔적이다.',detail:'무언가 밖에서 들어오려 한 흔적이 아니라, 안쪽에 있던 누군가가 바깥으로 나가려 했던 자국처럼 보인다.',note:'「결계는 우리를 지키는 걸까, 가두는 걸까?」'}
  };
  function freshState(){return{loc:'plaza',trust:0,traces:{},memory:false,decoded:false,unlocked:{plaza:true,house:false,barrier:false},decisions:{barrier:null,confront:null},tab:'traces'};}
  let state=freshState();
  const HWAYEONG_PORTRAITS={
    normal:'./assets/characters/화영(일반).png',
    anxious:'./assets/characters/화영(불안).png',
    grateful:'./assets/characters/화영(감사).png'
  };
  const portraitCache=new Map();
  let hwayeongMood='normal';
  let hwayeongOnStage=false;

  function colorDistance(data,index,bg){
    const dr=data[index]-bg[0], dg=data[index+1]-bg[1], db=data[index+2]-bg[2];
    return Math.sqrt(dr*dr+dg*dg+db*db);
  }
  function removeConnectedBackground(image){
    const canvas=document.createElement('canvas');
    canvas.width=image.naturalWidth;
    canvas.height=image.naturalHeight;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0);

    const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
    const data=frame.data, w=canvas.width, h=canvas.height;

    // Estimate the flat source background from several border samples.
    const samples=[];
    const samplePoint=(x,y)=>{
      const n=(y*w+x)*4;
      samples.push([data[n],data[n+1],data[n+2]]);
    };
    const stepX=Math.max(1,Math.floor(w/12));
    const stepY=Math.max(1,Math.floor(h/12));
    for(let x=0;x<w;x+=stepX){samplePoint(x,0);samplePoint(x,h-1)}
    for(let y=0;y<h;y+=stepY){samplePoint(0,y);samplePoint(w-1,y)}

    const bg=[0,0,0];
    samples.forEach(c=>{bg[0]+=c[0];bg[1]+=c[1];bg[2]+=c[2]});
    bg[0]/=samples.length; bg[1]/=samples.length; bg[2]/=samples.length;

    // Key out the same beige colour everywhere, not only pixels connected
    // to the outer border. This removes background trapped between hair strands.
    const clearDistance=20;
    const featherDistance=38;
    for(let p=0;p<w*h;p++){
      const n=p*4;
      if(data[n+3]===0)continue;
      const d=colorDistance(data,n,bg);
      if(d<=clearDistance){
        data[n+3]=0;
      }else if(d<featherDistance){
        const t=(d-clearDistance)/(featherDistance-clearDistance);
        data[n+3]=Math.min(data[n+3],Math.round(255*t));
      }
    }

    ctx.putImageData(frame,0,0);
    return canvas.toDataURL('image/webp',0.94);
  }
  function loadPortrait(mood){
    if(portraitCache.has(mood))return Promise.resolve(portraitCache.get(mood));
    return new Promise((resolve,reject)=>{
      const source=new Image();
      source.onload=()=>{
        try{
          const cleaned=removeConnectedBackground(source);
          portraitCache.set(mood,cleaned);
          resolve(cleaned);
        }catch(error){reject(error)}
      };
      source.onerror=()=>reject(new Error('Portrait not found: '+HWAYEONG_PORTRAITS[mood]));
      source.src=HWAYEONG_PORTRAITS[mood];
    });
  }
  function hideHwayeong(){
    hwayeongOnStage=false;
    const sprite=$('hwayeongSprite');
    if(sprite)sprite.classList.remove('visible');
  }
  function setHwayeongMood(mood='normal'){
    hwayeongMood=mood;
    hwayeongOnStage=true;
    const sprite=$('hwayeongSprite');
    if(!sprite)return;

    const cached=portraitCache.get(mood);
    if(cached){
      sprite.src=cached;
      sprite.classList.add('visible');
      return;
    }

    loadPortrait(mood).then(src=>{
      if(!hwayeongOnStage || hwayeongMood!==mood)return;
      sprite.src=src;
      sprite.classList.add('visible');
    }).catch(()=>{
      sprite.classList.remove('visible');
    });
  }
  function preloadPortraits(){
    Object.keys(HWAYEONG_PORTRAITS).forEach(mood=>{loadPortrait(mood).catch(()=>{})});
  }
  function hwayeongSay(text,mood='normal',options=[],onAdvance=null){
    setHwayeongMood(mood);
    say('화영',text,options,onAdvance);
  }
  function safeStorageGet(key){try{return localStorage.getItem(key)}catch(_){return null}}
  function safeStorageSet(key,value){try{localStorage.setItem(key,value);return true}catch(_){return false}}
  function showScreen(id){document.querySelectorAll('.screen').forEach(el=>el.classList.remove('on'));const target=$(id);if(target)target.classList.add('on')}
  function discoveredCount(){return Object.values(state.traces).filter(Boolean).length}
  function relationshipLabel(){if(state.trust>=2)return'가까움';if(state.trust>=1)return'조금 가까움';if(state.trust<0)return'경계';return'낯섦'}
  function updateStatus(){$('traceStat').textContent='흔적 '+discoveredCount();$('memoryStat').textContent='기억 '+(state.memory?1:0);$('trustStat').textContent='화영 · '+relationshipLabel();renderPlaces();updateHint()}
  function updateHint(){let text='마을을 직접 살펴보자.';if(!state.traces.statement)text='화영에게 결계에 대해 물어볼 수 있다.';else if(!(state.traces.statement&&state.traces.painting))text='화영의 말과 맞지 않는 흔적이 있을지도 모른다.';else if(!state.decoded)text='기록의 해독 탭에서 두 흔적을 비교해보자.';else if(!state.memory)text='해독한 가설을 화영에게 확인해보자.';else text='첫 번째 기억이 복원됐다.';$('hint').textContent=text}
  const TYPE_SPEED=32;
  let typingTimer=null;
  let isTyping=false;
  let fullDialogueText='';
  let dialogueIndex=0;
  let pendingOptions=[];
  let pendingAdvance=null;

  function clearTypingTimer(){if(typingTimer!==null){clearInterval(typingTimer);typingTimer=null}}
  function renderDialogueOptions(options){
    const box=$('choices');
    box.innerHTML='';
    options.forEach(option=>{
      const button=document.createElement('button');
      button.type='button';
      button.className='btn'+(option.primary?' primary':'');
      button.textContent=option.label;
      button.addEventListener('click',(event)=>{
        event.stopPropagation();
        box.innerHTML='';
        option.action();
      });
      box.appendChild(button);
    });
  }
  function finishTyping(){
    clearTypingTimer();
    isTyping=false;
    $('text').textContent=fullDialogueText;
    if(pendingOptions.length)renderDialogueOptions(pendingOptions);
  }
  function say(name,text,options=[],onAdvance=null){
    clearTypingTimer();
    $('speaker').textContent=name;
    fullDialogueText=String(text??'');
    dialogueIndex=0;
    pendingOptions=options;
    pendingAdvance=onAdvance;
    $('text').textContent='';
    $('choices').innerHTML='';
    isTyping=true;

    if(!fullDialogueText){
      finishTyping();
      return;
    }

    typingTimer=setInterval(()=>{
      dialogueIndex+=1;
      $('text').textContent=fullDialogueText.slice(0,dialogueIndex);
      if(dialogueIndex>=fullDialogueText.length)finishTyping();
    },TYPE_SPEED);
  }
  function advanceDialogue(event){
    if(event.target.closest('button'))return;
    if(isTyping){
      finishTyping();
      return;
    }
    if(pendingOptions.length)return;
    if(pendingAdvance){
      const next=pendingAdvance;
      pendingAdvance=null;
      next();
    }
  }
  function playerSpeak(text,nextAction){say('일운','“'+text+'”',[],nextAction)}
  function playerThink(text,nextAction){say('일운',text,[],nextAction)}
  function introFor(loc){if(loc==='house')return'화영의 방. 벽에 낯선 풍경의 그림이 걸려 있다.';if(loc==='barrier')return'결계 가까이 다가가자 표면에 긴 긁힌 자국이 보인다.';return'조용한 광장. 화영이 가로등 아래 서 있다.'}
  function renderPlaces(){const box=$('places');box.innerHTML='';[['plaza','광장'],['house','화영의 집'],['barrier','결계']].forEach(([id,label])=>{const button=document.createElement('button');button.type='button';button.className='place'+(state.loc===id?' on':'');button.disabled=!state.unlocked[id];button.textContent=(button.disabled?'🔒 ':'')+label;button.addEventListener('click',()=>{hideHwayeong();state.loc=id;closeArchive();renderScene();say('일운',introFor(id),id==='plaza'?[{label:'화영과 이야기한다',action:talk}]:[])});box.appendChild(button)})}
  function makeHotspot(key,left,top){const button=document.createElement('button');button.type='button';button.className='hot'+(state.traces[key]?' done':'');button.style.left=left;button.style.top=top;button.textContent='?';button.setAttribute('aria-label',traces[key].title);button.addEventListener('click',()=>inspect(key));$('hots').appendChild(button)}
  function renderScene(){const art=$('art');$('hots').innerHTML='';$('locTitle').textContent=state.loc==='plaza'?'꿈속 광장':state.loc==='house'?'화영의 집':'결계';if(state.loc==='plaza'){art.innerHTML='<div class="ground"></div><div class="house"></div>';makeHotspot('clock','31%','28%')}else if(state.loc==='house'){art.innerHTML='<div class="room"><div class="painting"></div></div>';makeHotspot('painting','30%','30%')}else{art.innerHTML='<div class="ground"></div><div class="barrier"></div>';makeHotspot('scratch','75%','48%')}if(hwayeongOnStage)setHwayeongMood(hwayeongMood);else $('hwayeongSprite').classList.remove('visible');updateStatus()}
  function inspect(key){
    hideHwayeong();
    state.traces[key]=true;
    renderScene();
    if(key==='painting'&&state.traces.statement&&!state.decoded){
      say('일운','흔적 발견 — '+traces[key].title,[],()=>say('일운','잠깐. 밖에 나간 적 없다는 말과 이 그림은 서로 맞지 않는다.',[
        {label:'두 흔적을 비교한다',primary:true,action:()=>openArchive('decode')},
        {label:'그림의 기록을 자세히 본다',action:()=>openArchive('traces',key)}
      ]));
      return;
    }
    say('일운','흔적 발견 — '+traces[key].title,[{label:'기록에서 자세히 본다',primary:true,action:()=>openArchive('traces',key)}]);
  }
  function talk(){if(!state.traces.statement){hwayeongSay('“뭐가 궁금해요?”','normal',[{label:'“결계 밖에는 뭐가 있어?”',action:()=>playerSpeak('저 결계 너머엔 뭐가 있어?',()=>{state.traces.statement=true;state.unlocked.house=true;state.unlocked.barrier=true;updateStatus();hwayeongSay('“몰라요. 저는 밖에 나가본 적 없어요.”','anxious',[{label:'계속 이유를 캐묻는다',action:()=>lockBarrier('push')},{label:'더 묻지 않는다',primary:true,action:()=>lockBarrier('wait')}])})}]);return}if(state.decoded&&!state.memory){confront();return}if(state.decisions.barrier==='push'){hwayeongSay('“…아까 그 이야기는 더 하고 싶지 않아요.”','anxious');return}if(state.decisions.barrier==='wait'){hwayeongSay('“아까 기다려줘서 고마웠어요.”','grateful',[{label:'“같이 조금 걸을래?”',action:()=>playerSpeak('같이 조금 걸을래? 계속 여기 서 있는 것도 그렇고.',()=>{state.trust+=1;updateStatus();hwayeongSay('“…네. 잠깐이라면.”','grateful')})}]);return}hwayeongSay('“오늘은 조용하네요.”','normal')}
  function lockBarrier(value){if(state.decisions.barrier!==null)return;state.decisions.barrier=value;if(value==='push'){state.trust-=1;updateStatus();playerSpeak('정말 한 번도? 그런데 왜 그렇게 바로 대답해? 뭔가 알고 있는 것 같은데.',()=>hwayeongSay('“…처음 보는 사람한테 그걸 왜 말해야 하죠?”','anxious'))}else{state.trust+=1;updateStatus();playerSpeak('…알겠어. 말하기 싫으면 지금은 안 해도 돼.',()=>hwayeongSay('“…고마워요. 제 방에 있는 그림 정도는 봐도 돼요.”','grateful'))}}
  function confront(){if(state.decisions.confront!==null){hwayeongSay(state.decisions.confront==='accuse'?'“그 이야기는 이제 그만했으면 좋겠어요.”':'“…아직 설명은 못 하겠지만, 기다려줘서 고마워요.”',state.decisions.confront==='accuse'?'anxious':'grateful');return}hwayeongSay('“아까부터 할 말 있어 보여요.”','anxious',[{label:'[해독] “거짓말한 거야?”',action:()=>lockConfront('accuse')},{label:'[해독] “말하기 힘들면 기다릴게.”',primary:true,action:()=>lockConfront('wait')}])}
  function lockConfront(value){if(state.decisions.confront!==null)return;state.decisions.confront=value;if(value==='accuse'){state.trust-=2;updateStatus();playerSpeak('밖에 나간 적 없다면서. 그럼 그 그림은 뭐야? 나한테 거짓말한 거야?',()=>hwayeongSay('“…그렇게 생각하고 싶으면 그렇게 생각해요.”','anxious'))}else{state.trust+=2;updateStatus();playerSpeak('말하기 힘들면 지금은 안 해도 돼. 그냥… 네가 말할 수 있을 때까지 기다릴게.',()=>hwayeongSay('“…본 적은 없어요. 그런데 기억나요. 저 바깥 풍경이.”','anxious',[{label:'기억을 복원한다',primary:true,action:()=>{state.memory=true;updateStatus();say('기억','「보지 못한 풍경」이 복원되었다.',[{label:'기억 확인',primary:true,action:()=>openArchive('memories')}])}}]))}}
  function openArchive(tab,detailKey=null){state.tab=tab;$('archive').classList.remove('hide');renderArchive(detailKey)}
  function closeArchive(){$('archive').classList.add('hide')}
  function renderArchive(detailKey=null){const box=$('archive');box.innerHTML='<div class="tabs"><button type="button" class="tab '+(state.tab==='traces'?'on':'')+'" data-tab="traces">흔적</button><button type="button" class="tab '+(state.tab==='decode'?'on':'')+'" data-tab="decode">해독</button><button type="button" class="tab '+(state.tab==='memories'?'on':'')+'" data-tab="memories">기억</button><button type="button" class="tab '+(state.tab==='decisions'?'on':'')+'" data-tab="decisions">결정</button><button type="button" id="closeArc" class="btn">닫기</button></div><div id="arcBody"></div>';box.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>{state.tab=button.dataset.tab;renderArchive()}));$('closeArc').addEventListener('click',closeArchive);if(detailKey){renderTraceDetail(detailKey);return}const body=$('arcBody');if(state.tab==='traces'){const keys=Object.keys(state.traces).filter(key=>state.traces[key]);if(!keys.length){body.innerHTML='<p class="muted">아직 발견한 흔적이 없다.</p>';return}keys.forEach(key=>{const button=document.createElement('button');button.type='button';button.className='item';button.innerHTML='<strong>'+traces[key].title+'</strong><small>'+traces[key].summary+'</small>';button.addEventListener('click',()=>renderTraceDetail(key));body.appendChild(button)});return}if(state.tab==='decode'){renderDecode(body);return}if(state.tab==='memories'){body.innerHTML=state.memory?'<div class="detail"><p class="eyebrow">MEMORY 01</p><h3>보지 못한 풍경</h3><div class="cg"><strong>결계 너머를 바라보는 화영<br><small>“본 적은 없는데… 기억나요.”</small></strong></div><p class="muted">설명할 수 없던 모순이 하나의 장면으로 형태를 갖췄다.</p></div>':'<p class="muted">아직 복원된 기억이 없다.</p>';return}renderDecisions(body)}
  function renderTraceDetail(key){const body=$('arcBody');body.innerHTML='<button type="button" id="backList" class="btn">← 목록</button><div class="detail" style="margin-top:10px"><h3>'+traces[key].title+'</h3><p class="muted">'+traces[key].detail+'</p><div class="note">'+traces[key].note+'</div></div>';$('backList').addEventListener('click',()=>renderArchive())}
  function renderDecode(body){if(!(state.traces.statement&&state.traces.painting)){body.innerHTML='<p class="muted">서로 비교할 흔적이 아직 부족하다.</p>';return}if(state.decoded){body.innerHTML='<div class="detail"><h3>해독 완료</h3><p>화영은 직접 결계 밖을 본 적은 없지만, 바깥에 대한 기억을 가지고 있을 가능성이 있다.</p><div class="note">「모순은 거짓말의 증거가 아니라 잃어버린 기억의 흔적일 수도 있다.」</div></div>';return}body.innerHTML='<div class="detail"><h3>모순</h3><p>① 화영은 밖에 나간 적이 없다고 말했다.<br>② 그런데 결계 밖의 풍경을 자세히 그렸다.</p><button type="button" id="decodeOk" class="btn primary">“직접 본 적은 없어도 바깥에 대한 기억이 있다.”</button></div>';$('decodeOk').addEventListener('click',()=>{state.decoded=true;renderArchive();say('일운','이 가설을 화영에게 확인해볼 수 있겠다.');updateHint()})}
  function renderDecisions(body){let html='';if(state.decisions.barrier)html+='<div class="detail"><strong>결계에 대해 물었을 때</strong><p class="muted">'+(state.decisions.barrier==='push'?'계속 이유를 캐물었다.':'화영이 말할 때까지 기다리기로 했다.')+'</p></div>';if(state.decisions.confront)html+='<div class="detail" style="margin-top:8px"><strong>그림의 모순을 발견한 뒤</strong><p class="muted">'+(state.decisions.confront==='accuse'?'화영이 거짓말했다고 의심했다.':'설명하기 힘들다면 기다리겠다고 말했다.')+'</p></div>';body.innerHTML=html||'<p class="muted">아직 확정된 결정이 없다.</p>'}
  function saveGame(){const ok=safeStorageSet(SAVE_KEY,JSON.stringify(state));alert(ok?'저장했습니다.':'이 브라우저에서는 저장 기능을 사용할 수 없습니다.');updateContinueButton()}
  function loadGame(){const raw=safeStorageGet(SAVE_KEY);if(!raw)return false;try{const loaded=JSON.parse(raw);const base=freshState();state={...base,...loaded,traces:{...(loaded.traces||{})},unlocked:{...base.unlocked,...(loaded.unlocked||{})},decisions:{...base.decisions,...(loaded.decisions||{})}};return true}catch(_){return false}}
  function updateContinueButton(){$('continueBtn').disabled=!safeStorageGet(SAVE_KEY)}
  function startNewGame(){state=freshState();hwayeongMood='normal';hwayeongOnStage=false;showScreen('game');renderScene();hwayeongSay('“처음 보는 사람이네요. 길을 잃었어요?”','normal',[{label:'“여긴 어디야?”',primary:true,action:()=>playerSpeak('여긴… 어디야?',()=>hwayeongSay('“꿈이라고 생각하면 편해요.”','normal'))},{label:'주변부터 살펴본다',action:()=>playerThink('…일단 주변부터 확인해보자.')}])}
  document.querySelector('.dialog').addEventListener('click',advanceDialogue);
  $('newBtn').addEventListener('click',startNewGame);
  $('continueBtn').addEventListener('click',()=>{if(!loadGame()){alert('저장 데이터가 없습니다.');updateContinueButton();return}hwayeongOnStage=false;showScreen('game');renderScene();say('일운','저장된 꿈의 흐름을 이어간다.')});
  $('talkBtn').addEventListener('click',talk);
  $('recordBtn').addEventListener('click',()=>openArchive('traces'));
  $('saveBtn').addEventListener('click',saveGame);
  $('titleBtn').addEventListener('click',()=>{hideHwayeong();showScreen('title')});
  preloadPortraits();
  updateContinueButton();
})();
