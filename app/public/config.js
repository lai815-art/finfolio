/* Runtime config — edit this one line after deploying the price Worker.
   Leave empty ('') to disable live prices (holdings then use the
   transaction price). Example:
   window.FF_PRICE_API = 'https://finfolio-prices.your-subdomain.workers.dev'; */
/* 要用 wrangler deploy 輸出的正式網址，不要用 <版本前綴>-<worker名> 那種 preview URL：
   preview URL 釘在某個版本，之後 deploy 都不會反映上去。實際踩過——前端一直指著
   sweet-disk-086bfinfolio-prices...，所以報價明明修好也部署了，App 拿到的還是舊版的錯誤。 */
window.FF_PRICE_API = 'https://finfolio-prices.lai815.workers.dev';
