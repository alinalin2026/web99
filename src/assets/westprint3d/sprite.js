window.W3={sprite:'/westprint3d/images/product-01.webp'};
(function(){
  const map={t0:'product-01.webp',t1:'product-01.webp',t2:'product-02.webp',t3:'product-03.webp',t4:'product-04.webp',t5:'product-05.webp',t6:'product-06.webp',t7:'product-07.webp',t8:'product-08.webp'};
  function apply(){
    const style=document.createElement('style');
    style.textContent='.brandmark:before{display:none!important}.brandmark{overflow:hidden;padding:4px}.brandmark img{width:100%;height:100%;object-fit:contain;display:block}.sprite{background-image:none!important;position:relative;overflow:hidden}.sprite>img{width:100%;height:100%;object-fit:cover;display:block}.heroVisual .sprite>img{object-position:center}';
    document.head.appendChild(style);
    document.querySelectorAll('.sprite').forEach(el=>{
      const key=Object.keys(map).find(k=>el.classList.contains(k))||'t0';
      const img=document.createElement('img');
      img.src='/westprint3d/images/'+map[key];
      img.alt='WestPrint3D product';
      img.loading=el.closest('.heroVisual')?'eager':'lazy';
      img.decoding='async';
      el.replaceChildren(img);
    });
    document.querySelectorAll('.brandmark').forEach(el=>{
      const img=document.createElement('img');
      img.src='/westprint3d/images/logo.png';
      img.alt='WestPrint3D logo';
      el.replaceChildren(img);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
