/**
 * โมดูลกลางสำหรับระบบแนะนำสินค้า ใช้ร่วมกันในหน้า home.html / product.html / cart.html
 *
 * แนวคิด: Pre-Analysis (เก็บพฤติกรรมเป็น session event) -> ส่งให้ backend คำนวณ
 * Candidate Retrieval + Ranking (ดู server.js) -> ได้รายการสินค้าที่แนะนำกลับมาแสดงผล
 *
 * เรื่องความเป็นส่วนตัว: sessionId เป็นรหัสสุ่มที่ไม่ผูกกับตัวตนจริง เก็บไว้ใน
 * sessionStorage เท่านั้น (หายไปเมื่อปิดแท็บ/เบราว์เซอร์) ไม่ใช่ localStorage ที่อยู่ถาวร
 */
(function (window) {
  var API_BASE = 'https://1270dhw9-3000.asse.devtunnels.ms/api';
  var SESSION_KEY = 'rcm_session_id';

  function getSessionId() {
    var id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  // บันทึกพฤติกรรมของผู้ใช้ 1 เหตุการณ์ (view / click / cart / purchase)
  function trackEvent(productId, category, action) {
    if (!productId || !action) return;
    fetch(API_BASE + '/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: getSessionId(),
        productId: productId,
        category: category || '',
        action: action
      })
    }).catch(function () { /* เงียบไว้ ไม่ให้กระทบ UX หลัก ถ้า backend ไม่ตอบ */ });
  }

  function fetchRecommendations(opts) {
    opts = opts || {};
    var params = new URLSearchParams();
    params.set('sessionId', getSessionId());
    if (opts.productId) params.set('productId', opts.productId);
    if (opts.cartIds && opts.cartIds.length) params.set('cartIds', opts.cartIds.join(','));
    if (opts.exclude && opts.exclude.length) params.set('exclude', opts.exclude.join(','));
    params.set('limit', opts.limit || 4);

    return fetch(API_BASE + '/recommendations?' + params.toString())
      .then(function (res) {
        if (!res.ok) throw new Error('fetch recommendations failed');
        return res.json();
      });
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function recCardHtml(product) {
    var price = Number(product.price);
    var img = product.image
      ? '<img src="' + escapeHtml(product.image) + '" alt="' + escapeHtml(product.name) + '" onerror="this.style.display=\'none\';this.parentElement.classList.add(\'rec-card-img-fallback\')">'
      : '';
    var iconFallback = '<span class="rec-card-icon">' + escapeHtml(product.icon || '📦') + '</span>';
    return (
      '<div class="rec-card" onclick="location.href=\'product.html?id=' + encodeURIComponent(product.id) + '\'">' +
        '<div class="rec-card-img">' + (product.image ? img : iconFallback) + '</div>' +
        '<div class="rec-card-name">' + escapeHtml(product.name) + '</div>' +
        '<div class="rec-card-price">$' + (isNaN(price) ? '-' : price.toFixed(2)) + '</div>' +
      '</div>'
    );
  }

  window.RCM = {
    getSessionId: getSessionId,
    trackEvent: trackEvent,
    fetchRecommendations: fetchRecommendations,
    recCardHtml: recCardHtml
  };
})(window);